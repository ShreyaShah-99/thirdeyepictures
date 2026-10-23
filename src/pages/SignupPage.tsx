import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoImg from '../assets/Images/ThirdEye_Logo.png'
import { useAuth } from '../auth'
import * as cognito from '../cognito'
import { FormField } from '../components'
import { ButtonSpinner } from '../Spinner'

export function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'register' | 'confirm'>('register')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    // Must match the Cognito pool password policy (min 8 + upper + lower +
    // number + symbol), else Cognito rejects the sign-up server-side.
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.')
      return
    }
    const handleTrimmed = handle.trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,30}$/.test(handleTrimmed)) {
      setError('Username must be 3-30 characters: letters, numbers, dot, underscore or hyphen.')
      return
    }
    const phoneTrimmed = phone.trim()
    if (!/^\+[1-9]\d{7,14}$/.test(phoneTrimmed)) {
      setError('Enter phone in international format, e.g. +919876543210.')
      return
    }
    setSubmitting(true)
    try {
      const { username: newUsername } = await cognito.signUp(
        handleTrimmed, email.trim(), password, name.trim(), phoneTrimmed,
      )
      setUsername(newUsername)
      setInfo(`We sent a verification code to ${email.trim()}.`)
      setStep('confirm')
    } catch (err: any) {
      setError(err?.message ?? 'Could not create account.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await cognito.confirmSignUp(username, code.trim())
      // Auto sign-in after confirmation.
      const res = await login(email.trim(), password)
      if (res.ok) {
        navigate('/')
      } else {
        // Confirmed but couldn't auto-login — send them to the login page.
        navigate('/login')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Invalid verification code.')
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setError('')
    setInfo('')
    try {
      await cognito.resendCode(username)
      setInfo('A new code has been sent.')
    } catch (err: any) {
      setError(err?.message ?? 'Could not resend code.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo-wrap">
          <img src={logoImg} alt="Third Eye Photography" className="login-logo" />
        </div>

        {step === 'register' ? (
          <>
            <h1>Create your account</h1>
            <p>Register to access the production workspace.</p>

            <form onSubmit={handleRegister} style={{ marginTop: 18 }}>
              <FormField label="Full Name">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </FormField>
              <FormField label="Username">
                <input
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  placeholder="e.g. rahul_s"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@thirdeye.in"
                  required
                />
              </FormField>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                />
              </FormField>
              <FormField label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8+ chars, upper, lower, number & symbol"
                    required
                    style={{ width: '100%', paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: 0, color: '#7c7572', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </FormField>

              {info && <div className="login-info">{info}</div>}
              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="btn btn-primary full" disabled={submitting}>
                {submitting ? <><ButtonSpinner /> Creating account...</> : 'Create Account'}
              </button>
            </form>

            <p style={{ marginTop: 16, fontSize: 12, textAlign: 'center', color: '#7c7572' }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Verify your email</h1>
            <p>Enter the verification code we emailed you.</p>

            <form onSubmit={handleConfirm} style={{ marginTop: 18 }}>
              <FormField label="Verification Code">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </FormField>

              {info && <div className="login-info">{info}</div>}
              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="btn btn-primary full" disabled={submitting}>
                {submitting ? <><ButtonSpinner /> Verifying...</> : 'Verify & Continue'}
              </button>
            </form>

            <p style={{ marginTop: 16, fontSize: 12, textAlign: 'center', color: '#7c7572' }}>
              Didn't get a code?{' '}
              <button
                type="button"
                onClick={resend}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 12 }}
              >
                Resend
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
