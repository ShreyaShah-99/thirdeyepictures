import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoImg from '../assets/Images/ThirdEye_Logo.png'
import { confirmForgotPassword, forgotPassword } from '../cognito'
import { FormField } from '../components'
import { ButtonSpinner } from '../Spinner'

/**
 * Two-step password reset using Cognito's forgot-password flow:
 *  1. "request" — user enters their username/email; Cognito sends a code.
 *  2. "reset"   — user enters the code + a new password.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!identifier.trim()) { setError('Enter your username or email.'); return }
    setSubmitting(true)
    try {
      await forgotPassword(identifier.trim())
      setInfo('We sent a verification code to the email on your account. Enter it below with your new password.')
      setStep('reset')
    } catch (err: any) {
      setError(err?.message ?? 'Could not start password reset.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!code.trim()) { setError('Enter the verification code.'); return }
    if (!newPassword) { setError('Enter a new password.'); return }
    setSubmitting(true)
    try {
      await confirmForgotPassword(identifier.trim(), code.trim(), newPassword)
      setInfo('Password reset. You can now sign in with your new password.')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err: any) {
      setError(err?.message ?? 'Could not reset password. Check the code and try again.')
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

        <h1>Reset your password</h1>
        <p>
          {step === 'request'
            ? "Enter your username or email and we'll send a verification code."
            : 'Enter the code from your email and choose a new password.'}
        </p>

        {step === 'request' ? (
          <form onSubmit={requestCode} style={{ marginTop: 18 }}>
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

            {error && <div className="login-error">{error}</div>}
            {info && <div style={{ color: '#2e9e5b', fontSize: 12, margin: '8px 0 0' }}>{info}</div>}

            <button type="submit" className="btn btn-primary full" disabled={submitting}>
              {submitting ? <><ButtonSpinner /> Sending...</> : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} style={{ marginTop: 18 }}>
            <FormField label="Verification Code">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </FormField>

            <FormField label="New Password">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Choose a strong password"
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
            {info && <div style={{ color: '#2e9e5b', fontSize: 12, margin: '8px 0 0' }}>{info}</div>}

            <button type="submit" className="btn btn-primary full" disabled={submitting}>
              {submitting ? <><ButtonSpinner /> Resetting...</> : 'Reset Password'}
            </button>

            <p style={{ marginTop: 12, fontSize: 12, textAlign: 'center', color: '#7c7572' }}>
              Didn't get a code?{' '}
              <button
                type="button"
                onClick={() => { setStep('request'); setError(''); setInfo('') }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, font: 'inherit' }}
              >
                Try again
              </button>
            </p>
          </form>
        )}

        <p style={{ marginTop: 16, fontSize: 12, textAlign: 'center', color: '#7c7572' }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
