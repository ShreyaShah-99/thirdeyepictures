import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoImg from '../assets/Images/ThirdEye_Logo.png'
import { useAuth } from '../auth'
import { FormField } from '../components'
import { ButtonSpinner } from '../Spinner'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // New-password challenge state (first login with a temporary password)
  const [needNewPassword, setNeedNewPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [completeNewPassword, setCompleteNewPassword] =
    useState<((pw: string, attrs?: { name?: string; phoneNumber?: string }) => Promise<void>) | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await login(identifier.trim(), password)
      if (res.ok) {
        navigate('/')
      } else if ('newPasswordRequired' in res && res.newPasswordRequired) {
        // Cognito wants the user to set a permanent password
        setCompleteNewPassword(() => res.completeNewPassword)
        setNeedNewPassword(true)
      } else if ('error' in res) {
        setError(res.error ?? 'Invalid credentials.')
      } else {
        setError('Invalid credentials.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completeNewPassword) return
    setError('')
    setSubmitting(true)
    try {
      await completeNewPassword(newPassword, {
        name: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      })
      navigate('/')
    } catch (err: any) {
      setError(err?.message ?? 'Could not set new password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-logo-wrap">
          <img src={logoImg} alt="Third Eye Photography" className="login-logo" />
        </div>

        {!needNewPassword ? (
          <>
            <h1>Capturing Love Beyond Vision</h1>
            <p>Sign in to TEAM, Together Everyone Archieves More..</p>

            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
              <FormField label="Username or Email">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="username or you@thirdeye.in"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </FormField>

              <FormField label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="btn btn-primary full" disabled={submitting}>
                {submitting ? <><ButtonSpinner /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <p style={{ marginTop: 14, fontSize: 12, textAlign: 'center', color: '#7c7572' }}>
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
            <p style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: '#7c7572' }}>
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p>This is your first sign-in. Please choose a new password.</p>

            <form onSubmit={handleNewPassword} style={{ marginTop: 18 }}>
              <FormField label="Full Name">
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </FormField>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210"
                  required
                />
              </FormField>
              <FormField label="New Password">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  required
                />
              </FormField>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="btn btn-primary full" disabled={submitting}>
                {submitting ? <><ButtonSpinner /> Saving...</> : 'Set Password & Continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
