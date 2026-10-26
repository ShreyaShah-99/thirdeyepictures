/**
 * Cognito authentication helper.
 * Handles login, session, new-password challenge, logout, and token retrieval.
 */
import {
    AuthenticationDetails,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserPool,
    CognitoUserSession,
} from 'amazon-cognito-identity-js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
})

// ─── Self sign-up ──────────────────────────────────────────────────────────────

/**
 * Register a new user in Cognito. Cognito emails them a verification code.
 * The account exists but must be confirmed (see confirmSignUp) before login.
 *
 * The pool uses a human-chosen handle as the real Cognito username (same as the
 * existing `admin`/`shreya`/`thirdeye` accounts), with email as an ALIAS. So the
 * user can sign in afterwards with EITHER their username OR their email.
 * Usernames are case-insensitive in this pool, so we store the handle lowercase.
 */
export function signUp(
  username: string,
  email: string,
  password: string,
  name: string,
  phoneNumber?: string,
): Promise<{ username: string }> {
  const handle = username.trim().toLowerCase()

  const attributes = [
    new CognitoUserAttribute({ Name: 'email', Value: email }),
    new CognitoUserAttribute({ Name: 'name', Value: name }),
  ]
  // The pool requires phone_number (E.164 format, e.g. +919876543210).
  if (phoneNumber) {
    attributes.push(new CognitoUserAttribute({ Name: 'phone_number', Value: phoneNumber }))
  }
  return new Promise((resolve, reject) => {
    userPool.signUp(handle, password, attributes, [], (err, result) => {
      if (err) return reject(err)
      // The handle IS the username; confirmation targets it directly.
      resolve({ username: result?.user.getUsername() ?? handle })
    })
  })
}

/**
 * Confirm a new sign-up with the emailed verification code.
 * Pass the username returned by signUp (not the email — the email is only an
 * alias and cannot reliably resolve a pending unconfirmed user).
 */
export function confirmSignUp(username: string, code: string): Promise<void> {
  const user = new CognitoUser({ Username: username, Pool: userPool })
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

/** Resend the sign-up verification code. Takes the username from signUp. */
export function resendCode(username: string): Promise<void> {
  const user = new CognitoUser({ Username: username, Pool: userPool })
  return new Promise((resolve, reject) => {
    user.resendConfirmationCode((err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

// ─── Forgot / reset password ────────────────────────────────────────────────

/**
 * Start a password reset. Cognito emails/SMSes a verification code to the
 * account. Accepts a username, email alias, or phone alias (normalized the
 * same way as login).
 */
export function forgotPassword(identifier: string): Promise<void> {
  const username = normalizeIdentifier(identifier)
  const user = new CognitoUser({ Username: username, Pool: userPool })
  return new Promise((resolve, reject) => {
    user.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

/**
 * Complete a password reset using the emailed code and a new password.
 */
export function confirmForgotPassword(
  identifier: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const username = normalizeIdentifier(identifier)
  const user = new CognitoUser({ Username: username, Pool: userPool })
  return new Promise((resolve, reject) => {
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

export interface CognitoProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'team'
  groups: string[]
}

/** Attributes collected on the first-login "set new password" step. */
export interface NewPasswordAttrs {
  name?: string
  /** E.164 format, e.g. +919876543210 */
  phoneNumber?: string
}

/** Build a profile object from a Cognito session's ID token. */
function profileFromSession(session: CognitoUserSession): CognitoProfile {
  const payload = session.getIdToken().decodePayload()
  const groups: string[] = payload['cognito:groups'] ?? []
  const role: 'admin' | 'team' = groups.includes('admin') ? 'admin' : 'team'
  return {
    id: payload.sub,
    email: payload.email ?? '',
    name: payload.name ?? payload.email ?? '',
    role,
    groups,
  }
}

/**
 * Normalize a login identifier. The pool accepts several values in the username
 * slot, resolved case-insensitively:
 *   - username   (the handle chosen at sign-up, e.g. "thirdeye")
 *   - email      (alias, e.g. you@thirdeye.in)
 *   - phone_number in E.164 (e.g. +919876543210)
 * Usernames/emails are lowercased (this pool is case-insensitive); phone-like
 * input has spaces/dashes stripped so "+91 98765 43210" still resolves.
 */
function normalizeIdentifier(raw: string): string {
  const id = raw.trim()
  // Phone-like: starts with + or is all digits/space/dash/paren.
  if (/^\+?[\d\s()-]+$/.test(id)) {
    return id.replace(/[\s()-]/g, '')
  }
  // Otherwise treat as email/username — emails are case-insensitive in Cognito.
  return id.toLowerCase()
}

/**
 * Log in with an identifier (email or phone-number alias) + password.
 * If Cognito requires a new password (first login), the returned object
 * has `newPasswordRequired: true` and a `completeNewPassword` callback.
 */
export function login(
  identifier: string,
  password: string
): Promise<
  | { profile: CognitoProfile; newPasswordRequired?: false }
  | {
      newPasswordRequired: true
      completeNewPassword: (newPassword: string, attrs?: NewPasswordAttrs) => Promise<CognitoProfile>
    }
> {
  const username = normalizeIdentifier(identifier)
  const user = new CognitoUser({ Username: username, Pool: userPool })
  const authDetails = new AuthenticationDetails({ Username: username, Password: password })

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({ profile: profileFromSession(session) })
      },
      onFailure: (err) => {
        reject(err)
      },
      newPasswordRequired: (userAttributes: any) => {
        // First-time login — Cognito forces a password reset.
        // Remove attributes Cognito won't accept back on the challenge.
        delete userAttributes.email_verified
        delete userAttributes.email
        delete userAttributes.sub

        // Track which attributes the account ALREADY has. Cognito rejects
        // re-sending an attribute that's already set (e.g. phone_number), so
        // we only send the ones that are still missing.
        const hasName = !!userAttributes.name
        const hasPhone = !!userAttributes.phone_number

        resolve({
          newPasswordRequired: true,
          completeNewPassword: (newPassword: string, attrs?: NewPasswordAttrs) =>
            new Promise<CognitoProfile>((res, rej) => {
              // Only supply required attributes that aren't already set.
              const required: Record<string, string> = {}
              if (!hasName && attrs?.name) required.name = attrs.name
              if (!hasPhone && attrs?.phoneNumber) required.phone_number = attrs.phoneNumber
              user.completeNewPasswordChallenge(
                newPassword,
                required,
                {
                  onSuccess: (session) => res(profileFromSession(session)),
                  onFailure: (e) => rej(e),
                }
              )
            }),
        })
      },
    })
  })
}

/** Returns the current profile if a valid session exists, else null. */
export function getCurrentProfile(): Promise<CognitoProfile | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser()
    if (!user) return resolve(null)
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null)
      resolve(profileFromSession(session))
    })
  })
}

/** Returns the current ID token (JWT) to send to the backend, or null. */
export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser()
    if (!user) return resolve(null)
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null)
      resolve(session.getIdToken().getJwtToken())
    })
  })
}

/** Sign the current user out locally. */
export function logout() {
  const user = userPool.getCurrentUser()
  if (user) user.signOut()
}
