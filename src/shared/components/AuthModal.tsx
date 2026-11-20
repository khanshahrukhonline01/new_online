import { useState, useEffect, useId, useRef, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon, type SiteIconName } from './SiteIcon'
import {
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  updatePassword,
  resendVerificationEmail,
  type UserRole,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import { registerCustomAcademy } from '../../modules/academies/academySaaSClient'
import { registerCustomCoach } from '../../modules/coaches/coachSaaSClient'
import './AuthModal.css'

export type AuthModalTab = 'login' | 'signup' | 'partner' | 'forgot_password' | 'expired_link' | 'set_new_password'

export interface AuthModalProps {
  isOpen: boolean
  initialTab?: AuthModalTab
  initialError?: string
  initialEmail?: string
  onClose: () => void
  onSuccess?: (user: AuthUserProfile) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

const MAJOR_CITIES = [
  'Delhi NCR',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Kolkata',
  'Chennai',
  'Pune',
  'Ahmedabad',
  'Chandigarh',
  'Jaipur',
  'Lucknow',
  'Bhopal',
  'Patna',
  'Dehradun',
  'Ranchi',
  'Guwahati',
  'Other',
]

const DEMO_ACCOUNTS: Array<{
  label: string
  role: UserRole
  email: string
  name: string
  city: string
  icon: SiteIconName
}> = [
  {
    label: 'Rohit Verma (Athlete)',
    role: 'athlete',
    email: 'rohit.verma@khelgrid.com',
    name: 'Rohit Verma',
    city: 'Delhi NCR',
    icon: 'user-round',
  },
  {
    label: 'Shivaji Cricket Academy (Director)',
    role: 'academy',
    email: 'director.shivaji@khelgrid.com',
    name: 'Coach Anand Patil',
    city: 'Pune',
    icon: 'building',
  },
  {
    label: 'Sunita Sharma (Parent)',
    role: 'parent',
    email: 'sunita.parent@khelgrid.com',
    name: 'Sunita Sharma',
    city: 'Delhi NCR',
    icon: 'users',
  },
  {
    label: 'FSV Arena (Turf Host)',
    role: 'host',
    email: 'host.fsv@khelgrid.com',
    name: 'FSV Sports Arena',
    city: 'Bengaluru',
    icon: 'building',
  },
  {
    label: 'Zaheer Farooq (Coach)',
    role: 'coach',
    email: 'zaheer.coach@khelgrid.com',
    name: 'Coach Zaheer Farooq',
    city: 'Delhi NCR',
    icon: 'award',
  },
  {
    label: 'KhelGrid Admin',
    role: 'admin',
    email: 'admin@khelgrid.com',
    name: 'KhelGrid Staff Admin',
    city: 'National',
    icon: 'shield-check',
  },
]

export default function AuthModal({
  isOpen,
  initialTab = 'login',
  initialError,
  initialEmail,
  onClose,
  onSuccess,
  onNavigate,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthModalTab>(initialTab)

  // Form Fields
  const [email, setEmail] = useState(initialEmail || '')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('athlete')
  const [city, setCity] = useState('Delhi NCR')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Partner Form Fields
  const [partnerCategory, setPartnerCategory] = useState<'academy' | 'coach' | 'host'>('academy')
  const [partnerAcademyName, setPartnerAcademyName] = useState('')
  const [partnerSport, setPartnerSport] = useState('Cricket')
  const [partnerCity, setPartnerCity] = useState('Delhi NCR')
  const [partnerDirectorName, setPartnerDirectorName] = useState('')
  const [partnerCoachCert, setPartnerCoachCert] = useState('SAI / NIS Patiala Diploma')
  const [partnerWhatsApp, setPartnerWhatsApp] = useState('')
  const [partnerUpi, setPartnerUpi] = useState('')

  // Status & Feedback
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(initialError || '')
  const [successMsg, setSuccessMsg] = useState('')
  const [emailVerificationPending, setEmailVerificationPending] = useState(false)

  const emailInputId = useId()
  const passwordInputId = useId()
  const nameInputId = useId()
  const cityInputId = useId()
  const phoneInputId = useId()

  const cardRef = useRef<HTMLDivElement>(null)

  // Sync tab with initialTab and initialError prop
  useEffect(() => {
    setTab(initialTab)
    if (initialError) {
      setErrorMsg(initialError)
    } else {
      setErrorMsg('')
    }
    if (initialEmail) {
      setEmail(initialEmail)
    }
    setSuccessMsg('')
    setEmailVerificationPending(false)
  }, [initialTab, initialError, initialEmail, isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const res = await signInWithEmail({ email, password })
      if (res.success && res.user) {
        setSuccessMsg(`Welcome back, ${res.user.fullName}!`)
        onSuccess?.(res.user)
        setTimeout(() => {
          onClose()
          if (res.user?.role === 'academy') {
            onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/academy-hub')
          } else if (res.user?.role === 'host' || res.user?.role === 'venue_owner') {
            onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/host')
          } else if (res.user?.role === 'coach') {
            onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/coach-dashboard')
          }
        }, 600)
      } else if (res.requiresEmailVerification) {
        setEmailVerificationPending(true)
        setSuccessMsg(`Magic login link sent to ${email}. Check your inbox.`)
      } else {
        setErrorMsg(res.message || 'Login failed. Please check your credentials.')
      }
    } catch {
      setErrorMsg('An unexpected connection error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMagicLinkSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address first to receive a magic link.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const res = await signInWithEmail({ email, useMagicLink: true })
      if (res.success) {
        setEmailVerificationPending(true)
        setSuccessMsg(`Magic sign-in link sent to ${email.trim()}. Check your inbox.`)
      } else {
        setErrorMsg(res.message || 'Could not send magic link.')
      }
    } catch {
      setErrorMsg('Failed to send magic link.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const derivedName = fullName.trim() || email.split('@')[0] || 'KhelGrid Athlete'
      const res = await signUpWithEmail({
        email,
        password,
        fullName: derivedName,
        role,
        city: city || 'Delhi NCR',
        phone,
      })
      if (res.success) {
        if (res.requiresEmailVerification) {
          setEmailVerificationPending(true)
          setSuccessMsg(`Verification email sent to ${email}. Please verify your email to continue.`)
        } else if (res.user) {
          setSuccessMsg(`Account created! Welcome, ${res.user.fullName}.`)
          onSuccess?.(res.user)
          setTimeout(() => {
            onClose()
            if (role === 'academy') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/academy-hub')
            } else if (role === 'host' || role === 'venue_owner') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/host')
            } else if (role === 'coach') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/coach-dashboard')
            } else if (role === 'athlete' || role === 'parent') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/dashboard')
            }
          }, 600)
        }
      } else {
        setErrorMsg(res.message || 'Registration could not be completed.')
      }
    } catch {
      setErrorMsg('Could not register account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePartnerSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      if (!partnerDirectorName.trim()) {
        setErrorMsg(partnerCategory === 'coach' ? 'Please enter Coach Name.' : 'Please enter the Director or Manager Name.')
        return
      }
      if (partnerCategory !== 'coach' && !partnerAcademyName.trim()) {
        setErrorMsg('Please enter your Academy or Facility Name.')
        return
      }
      if (!partnerWhatsApp.trim() || partnerWhatsApp.replace(/\D/g, '').length < 10) {
        setErrorMsg('Please provide a valid 10-digit WhatsApp/mobile number.')
        return
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please provide a valid account email address.')
        return
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.')
        return
      }

      if (partnerCategory === 'coach') {
        const coachName = partnerDirectorName.trim()
        const registeredCoach = registerCustomCoach({
          name: coachName,
          sport: partnerSport || 'Cricket',
          city: partnerCity || 'Delhi NCR',
          phone: partnerWhatsApp.trim(),
          email: email.trim(),
          certification: partnerCoachCert || 'SAI NIS / Federation Certified Coach',
          monthlyFee: 3500,
          upiVpa: partnerUpi.trim(),
        })

        const res = await signUpWithEmail({
          email,
          password,
          fullName: coachName,
          role: 'coach',
          city: partnerCity || 'Delhi NCR',
          phone: partnerWhatsApp.trim(),
        })

        if (res.user) {
          setSuccessMsg(`Welcome, ${coachName}! Coach profile registered successfully.`)
          onSuccess?.(res.user)
        } else {
          setSuccessMsg(`Coach profile registered! Launching Coach Hub...`)
        }

        setTimeout(() => {
          onClose()
          onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, `/coach-dashboard?coach=${registeredCoach.slug}`)
        }, 700)
        return
      }

      // 1. Register Academy in local SaaS storage with pending_review status
      const registered = registerCustomAcademy({
        name: partnerAcademyName.trim(),
        sport: partnerSport || 'Multi-Sport',
        city: partnerCity || 'Delhi NCR',
        directorName: partnerDirectorName.trim(),
        directorWhatsApp: partnerWhatsApp.trim(),
        upiVpa: partnerUpi.trim() || `${partnerAcademyName.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi`,
      })

      // 2. Create User Account with role 'academy' or 'host'
      const assignedRole = partnerCategory === 'host' ? 'host' : 'academy'
      const res = await signUpWithEmail({
        email,
        password,
        fullName: partnerDirectorName.trim(),
        role: assignedRole,
        city: partnerCity || 'Delhi NCR',
        phone: partnerWhatsApp.trim(),
      })

      if (res.user) {
        setSuccessMsg(`Welcome, ${partnerDirectorName}! ${partnerCategory === 'host' ? 'Facility' : 'Academy'} "${registered.name}" registered successfully.`)
        onSuccess?.(res.user)
      } else {
        setSuccessMsg(`Partner workspace registered! Launching hub...`)
      }

      setTimeout(() => {
        onClose()
        if (partnerCategory === 'host') {
          onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/host')
        } else {
          onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, `/academy-hub?academy=${registered.slug}`)
        }
      }, 700)
    } catch {
      setErrorMsg('Could not complete partner registration. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const res = await sendPasswordReset(email)
      if (res.success) {
        setSuccessMsg(res.message || 'Password reset instructions sent. Please check your email.')
      } else {
        setErrorMsg(res.message || 'Could not send reset email.')
      }
    } catch {
      setErrorMsg('Failed to request password reset.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const res = await updatePassword(newPassword)
      if (res.success) {
        setSuccessMsg(res.message || 'Password updated successfully! You can now sign in.')
        setTimeout(() => {
          setTab('login')
          setPassword('')
          setNewPassword('')
          setConfirmPassword('')
        }, 1500)
      } else {
        setErrorMsg(res.message || 'Could not update password.')
      }
    } catch {
      setErrorMsg('Failed to update password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendVerification = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter your email address to receive a fresh verification link.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)

    try {
      const res = await resendVerificationEmail(email.trim())
      if (res.success) {
        setSuccessMsg(res.message)
        setEmailVerificationPending(true)
      } else {
        setErrorMsg(res.message)
      }
    } catch {
      setErrorMsg('Failed to resend verification link. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDemoLogin = async (demo: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(demo.email)
    setPassword('KhelGrid@2026')
    setFullName(demo.name)
    setRole(demo.role)
    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await signInWithEmail({ email: demo.email, password: 'demo-password' })
      if (res.success && res.user) {
        setSuccessMsg(`Signed in as demo ${demo.role}: ${res.user.fullName}`)
        onSuccess?.(res.user)
        setTimeout(() => {
          onClose()
          if (demo.role === 'academy') {
            onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/academy-hub')
          } else if (demo.role === 'host') {
            onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/host')
          } else if (demo.role === 'coach') {
            onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/coach-dashboard')
          }
        }, 600)
      } else {
        // Fallback sign up demo user
        const signRes = await signUpWithEmail({
          email: demo.email,
          fullName: demo.name,
          role: demo.role,
          city: demo.city,
        })
        if (signRes.success && signRes.user) {
          setSuccessMsg(`Demo profile activated: ${signRes.user.fullName}`)
          onSuccess?.(signRes.user)
          setTimeout(() => {
            onClose()
            if (demo.role === 'academy') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/academy-hub')
            } else if (demo.role === 'host') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/host')
            } else if (demo.role === 'coach') {
              onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, '/coach-dashboard')
            }
          }, 600)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="kg-auth-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={cardRef}
        className="kg-auth-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kg-auth-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="kg-auth-header">
          <div className="kg-auth-brand">
            <span className="kg-auth-tiranga">
              <span className="kg-dot saffron" />
              <span className="kg-dot white" />
              <span className="kg-dot green" />
            </span>
            <span className="kg-auth-logo-text">KHELGRID AUTH</span>
            <span className="kg-auth-dpdp-pill">
              <SiteIcon name="shield-check" size={12} /> DPDP 2023 Secure
            </span>
          </div>

          <button
            type="button"
            className="kg-auth-close-btn"
            onClick={onClose}
            aria-label="Close authentication dialog"
          >
            <SiteIcon name="close" size={17} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`kg-auth-tabs ${tab === 'expired_link' ? 'has-five-tabs' : 'has-four-tabs'}`} role="tablist" aria-label="Sign in or register">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={`kg-auth-tab ${tab === 'login' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('login')
              setErrorMsg('')
              setSuccessMsg('')
            }}
          >
            <SiteIcon name="user-round" size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            className={`kg-auth-tab ${tab === 'signup' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('signup')
              setErrorMsg('')
              setSuccessMsg('')
            }}
          >
            <SiteIcon name="plus" size={14} />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'partner'}
            className={`kg-auth-tab kg-auth-tab-partner ${tab === 'partner' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('partner')
              setErrorMsg('')
              setSuccessMsg('')
            }}
          >
            <SiteIcon name="sparkles" size={14} />
            <span>Partner Signup</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'forgot_password'}
            className={`kg-auth-tab ${tab === 'forgot_password' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('forgot_password')
              setErrorMsg('')
              setSuccessMsg('')
            }}
          >
            <SiteIcon name="help-circle" size={14} />
            <span>Recovery</span>
          </button>
          {tab === 'expired_link' && (
            <button
              type="button"
              role="tab"
              aria-selected={true}
              className="kg-auth-tab is-active"
              style={{ color: '#dc2626', borderBottomColor: '#dc2626' }}
            >
              <SiteIcon name="alert-circle" size={14} />
              <span>Verify Link</span>
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="kg-auth-alert kg-auth-alert-error" role="alert">
            <SiteIcon name="alert-circle" size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="kg-auth-alert kg-auth-alert-success" role="status">
            <SiteIcon name="check-circle" size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {emailVerificationPending && (
          <div className="kg-auth-verification-box">
            <SiteIcon name="sparkles" size={20} className="kg-verify-icon" />
            <div>
              <strong>Verify Your Email Address</strong>
              <p>
                We sent a secure verification link to <strong>{email}</strong>. Click the link in
                your email to complete authentication.
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === 'login' && !emailVerificationPending && (
          <form className="kg-auth-form" onSubmit={handleLoginSubmit}>
            <h2 id="kg-auth-title" className="kg-auth-title">
              Sign in to your KhelGrid profile
            </h2>
            <p className="kg-auth-subtitle">
              Access your saved trials, sports turf bookings, athlete CV, and academy management workspace.
            </p>

            {/* Merged Partner Portal Callout */}
            <div className="kg-auth-partner-login-callout">
              <div className="kg-auth-partner-login-text">
                <SiteIcon name="building" size={15} />
                <span>Operating a Sports Academy or Turf?</span>
              </div>
              <button
                type="button"
                className="kg-auth-partner-login-btn"
                onClick={() => {
                  setTab('partner')
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
              >
                ⚡ 30s Partner Signup →
              </button>
            </div>

            <div className="kg-auth-field">
              <label htmlFor={emailInputId}>Email Address</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="mail" size={16} className="kg-input-icon" />
                <input
                  id={emailInputId}
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="kg-auth-field">
              <div className="kg-field-header">
                <label htmlFor={passwordInputId}>Password</label>
                <button
                  type="button"
                  className="kg-text-link"
                  onClick={() => setTab('forgot_password')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
                <input
                  id={passwordInputId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="kg-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <SiteIcon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
            </div>

            {errorMsg && (errorMsg.toLowerCase().includes('confirm') || errorMsg.toLowerCase().includes('expired')) && (
              <div style={{ margin: '8px 0 12px', textAlign: 'center' }}>
                <button
                  type="button"
                  className="kg-text-link"
                  onClick={() => setTab('expired_link')}
                  style={{ fontWeight: 700 }}
                >
                  ✉️ Need a fresh confirmation link? Click here to resend →
                </button>
              </div>
            )}

            <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In with Password'}
            </button>

            <div className="kg-auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="kg-auth-magic-btn"
              onClick={handleMagicLinkSubmit}
              disabled={submitting}
            >
              <SiteIcon name="sparkles" size={15} />
              <span>Send 1-Click Magic Login Link</span>
            </button>

            {/* Fast Demo Accounts */}
            <div className="kg-auth-demo-section">
              <span className="kg-demo-title">TEST / DEMO ACCOUNTS</span>
              <div className="kg-demo-grid">
                {DEMO_ACCOUNTS.map(demo => (
                  <button
                    key={demo.role}
                    type="button"
                    className="kg-demo-chip"
                    onClick={() => handleDemoLogin(demo)}
                  >
                    <SiteIcon name={demo.icon} size={13} />
                    <span>{demo.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: SIGN UP */}
        {tab === 'signup' && !emailVerificationPending && (
          <form className="kg-auth-form" onSubmit={handleSignUpSubmit}>
            <h2 id="kg-auth-title" className="kg-auth-title">
              Join KhelGrid Sports Network
            </h2>
            <p className="kg-auth-subtitle">
              Create your account to save trials, build an athlete CV, or host verified sports venues.
            </p>

            {/* Role Selection */}
            <div className="kg-auth-field">
              <span className="kg-auth-role-label">I AM JOINING AS:</span>
              <div className="kg-role-picker-grid">
                <button
                  type="button"
                  className={`kg-role-card ${role === 'athlete' ? 'is-selected' : ''}`}
                  onClick={() => setRole('athlete')}
                >
                  <SiteIcon name="user-round" size={16} />
                  <div className="kg-role-info">
                    <strong>Athlete / Player</strong>
                    <span>Find trials, build Sports CV, play matches</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${role === 'parent' ? 'is-selected' : ''}`}
                  onClick={() => setRole('parent')}
                >
                  <SiteIcon name="users" size={16} />
                  <div className="kg-role-info">
                    <strong>Parent / Guardian</strong>
                    <span>Find sports academies &amp; trials for your child</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${role === 'academy' ? 'is-selected' : ''}`}
                  onClick={() => setRole('academy')}
                >
                  <SiteIcon name="building" size={16} />
                  <div className="kg-role-info">
                    <strong>Academy Director</strong>
                    <span>Manage admissions, batches &amp; student passes</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${role === 'host' ? 'is-selected' : ''}`}
                  onClick={() => setRole('host')}
                >
                  <SiteIcon name="building" size={16} />
                  <div className="kg-role-info">
                    <strong>Turf &amp; Venue Host</strong>
                    <span>Manage facility slots &amp; receive bookings</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${role === 'coach' ? 'is-selected' : ''}`}
                  onClick={() => setRole('coach')}
                >
                  <SiteIcon name="award" size={16} />
                  <div className="kg-role-info">
                    <strong>Certified Coach</strong>
                    <span>List verified coaching credentials &amp; trainees</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${role === 'scout' ? 'is-selected' : ''}`}
                  onClick={() => setRole('scout')}
                >
                  <SiteIcon name="search" size={16} />
                  <div className="kg-role-info">
                    <strong>Talent Scout</strong>
                    <span>Evaluate normative data &amp; scout athletes</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="kg-auth-field">
              <label htmlFor={nameInputId}>Full Name</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="user-round" size={16} className="kg-input-icon" />
                <input
                  id={nameInputId}
                  type="text"
                  required
                  placeholder="e.g. Aakash Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="kg-auth-field">
              <label htmlFor={emailInputId}>Email Address</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="mail" size={16} className="kg-input-icon" />
                <input
                  id={emailInputId}
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="kg-auth-field">
              <label htmlFor={passwordInputId}>Password (min 6 characters)</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
                <input
                  id={passwordInputId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="kg-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <SiteIcon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
            </div>

            <div className="kg-auth-row">
              <div className="kg-auth-field">
                <label htmlFor={cityInputId}>Home City</label>
                <select
                  id={cityInputId}
                  value={city}
                  onChange={e => setCity(e.target.value)}
                >
                  {MAJOR_CITIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="kg-auth-field">
                <label htmlFor={phoneInputId}>Mobile / WhatsApp (Optional)</label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="phone" size={16} className="kg-input-icon" />
                  <input
                    id={phoneInputId}
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
              {submitting ? 'Creating Account…' : 'Create KhelGrid Account'}
            </button>

            {/* Direct Partner Onboarding Callout */}
            <div className="kg-auth-partner-callout">
              <div className="kg-auth-partner-callout-title">
                <SiteIcon name="sparkles" size={14} />
                <span>Operating a Sports Academy or Turf?</span>
              </div>
              <p>Launch your Admissions CRM &amp; Turf Slot Manager in under 30 seconds.</p>
              <button
                type="button"
                className="kg-auth-partner-btn"
                onClick={() => {
                  setTab('partner')
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
              >
                ⚡ 30-Second Express Partner Onboarding →
              </button>
            </div>

            <p className="kg-auth-terms-note">
              By registering, you agree to KhelGrid’s <a href="/terms">Terms of Use</a>,{' '}
              <a href="/privacy">Privacy Policy</a>, and DPDP Act standards.
            </p>
          </form>
        )}

        {/* TAB: PARTNER SIGNUP */}
        {tab === 'partner' && !emailVerificationPending && (
          <form className="kg-auth-form" onSubmit={handlePartnerSubmit}>
            <h2 id="kg-auth-title" className="kg-auth-title">
              {partnerCategory === 'coach' ? 'Register Coach Operations Profile' : 'Register Academy or Sports Facility'}
            </h2>
            <p className="kg-auth-subtitle">
              {partnerCategory === 'coach'
                ? 'Manage trainees, coaching batches, parent inquiries, and direct 0% commission UPI fee collections.'
                : 'Free admissions CRM, turf slot scheduling, and UPI fee collections for sports academies & venues.'}
            </p>

            {/* Partner Track Selector */}
            <div className="kg-auth-field">
              <span className="kg-auth-role-label">I AM REGISTERING AS:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  className={`kg-role-card ${partnerCategory === 'academy' ? 'is-selected' : ''}`}
                  onClick={() => setPartnerCategory('academy')}
                  style={{ padding: '8px 10px' }}
                >
                  <SiteIcon name="building" size={15} />
                  <div className="kg-role-info">
                    <strong>Sports Academy</strong>
                    <span style={{ fontSize: '10.5px' }}>Admissions &amp; Batches</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${partnerCategory === 'coach' ? 'is-selected' : ''}`}
                  onClick={() => setPartnerCategory('coach')}
                  style={{ padding: '8px 10px' }}
                >
                  <SiteIcon name="award" size={15} />
                  <div className="kg-role-info">
                    <strong>Certified Coach</strong>
                    <span style={{ fontSize: '10.5px' }}>Trainees &amp; Inquiries</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`kg-role-card ${partnerCategory === 'host' ? 'is-selected' : ''}`}
                  onClick={() => setPartnerCategory('host')}
                  style={{ padding: '8px 10px' }}
                >
                  <SiteIcon name="venues" size={15} />
                  <div className="kg-role-info">
                    <strong>Turf &amp; Venue</strong>
                    <span style={{ fontSize: '10.5px' }}>Hourly Slots</span>
                  </div>
                </button>
              </div>
            </div>

            {partnerCategory !== 'coach' && (
              <div className="kg-auth-field">
                <label htmlFor="partner-name-input">Academy / Facility Name</label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="building" size={16} className="kg-input-icon" />
                  <input
                    id="partner-name-input"
                    type="text"
                    required
                    placeholder="e.g. Apex Cricket Academy, Kickoff Turf"
                    value={partnerAcademyName}
                    onChange={e => setPartnerAcademyName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="kg-auth-row">
              <div className="kg-auth-field">
                <label htmlFor="partner-sport-input">Primary Sport</label>
                <select
                  id="partner-sport-input"
                  value={partnerSport}
                  onChange={e => setPartnerSport(e.target.value)}
                >
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Multi-Sport">Multi-Sport</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Martial Arts">Martial Arts</option>
                  <option value="Athletics">Athletics</option>
                  <option value="Table Tennis">Table Tennis</option>
                  <option value="Squash">Squash</option>
                  <option value="Hockey">Hockey</option>
                </select>
              </div>

              <div className="kg-auth-field">
                <label htmlFor="partner-city-input">Operating City</label>
                <select
                  id="partner-city-input"
                  value={partnerCity}
                  onChange={e => setPartnerCity(e.target.value)}
                >
                  {MAJOR_CITIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="kg-auth-row">
              <div className="kg-auth-field">
                <label htmlFor="partner-director-input">
                  {partnerCategory === 'coach' ? 'Coach Full Name' : 'Director / Manager Name'}
                </label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="user-round" size={16} className="kg-input-icon" />
                  <input
                    id="partner-director-input"
                    type="text"
                    required
                    placeholder={partnerCategory === 'coach' ? 'e.g. Coach Ramesh Powar' : 'e.g. Coach Rajesh Kumar'}
                    value={partnerDirectorName}
                    onChange={e => setPartnerDirectorName(e.target.value)}
                  />
                </div>
              </div>

              <div className="kg-auth-field">
                <label htmlFor="partner-phone-input">
                  {partnerCategory === 'coach' ? 'WhatsApp (Inquiries)' : 'Director WhatsApp / Mobile'}
                </label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="phone" size={16} className="kg-input-icon" />
                  <input
                    id="partner-phone-input"
                    type="tel"
                    required
                    placeholder="9845012345 (for admissions)"
                    value={partnerWhatsApp}
                    onChange={e => setPartnerWhatsApp(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {partnerCategory === 'coach' && (
              <div className="kg-auth-field">
                <label htmlFor="partner-cert-input">Certification / Accreditation</label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="award" size={16} className="kg-input-icon" />
                  <input
                    id="partner-cert-input"
                    type="text"
                    required
                    placeholder="e.g. BCCI Level 2 · SAI / NIS Patiala Diploma"
                    value={partnerCoachCert}
                    onChange={e => setPartnerCoachCert(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="kg-auth-row">
              <div className="kg-auth-field">
                <label htmlFor="partner-email-input">Account Email</label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="mail" size={16} className="kg-input-icon" />
                  <input
                    id="partner-email-input"
                    type="email"
                    required
                    placeholder="director@academy.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="kg-auth-field">
                <label htmlFor="partner-password-input">Password (min 6 characters)</label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
                  <input
                    id="partner-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="kg-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <SiteIcon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="kg-auth-field">
              <label htmlFor="partner-upi-input">UPI ID for Direct Fee Collection (Optional)</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="sparkles" size={16} className="kg-input-icon" />
                <input
                  id="partner-upi-input"
                  type="text"
                  placeholder="e.g. apexcricket@okhdfcbank (or configure in settings)"
                  value={partnerUpi}
                  onChange={e => setPartnerUpi(e.target.value)}
                />
              </div>
            </div>

            <div className="kg-auth-partner-trust-note">
              <SiteIcon name="shield-check" size={18} style={{ color: '#d97706', flexShrink: 0 }} />
              <div>
                <strong>Express Launch &amp; Verification Protocol</strong>
                <p style={{ margin: 0 }}>
                  Your internal batch manager, student CRM, and UPI fee tracking activate immediately. The public <strong>&quot;KhelGrid Verified&quot;</strong> badge will appear on your listing upon review by the KhelGrid Editorial Moderation Desk.
                </p>
              </div>
            </div>

            <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
              {submitting ? 'Setting Up Workspace…' : '⚡ Register Academy & Launch Hub (30s)'}
            </button>

            <p className="kg-auth-switch-note">
              Already registered your academy or turf?{' '}
              <button
                type="button"
                className="kg-text-link"
                onClick={() => {
                  setTab('login')
                  setErrorMsg('')
                  setSuccessMsg('')
                }}
              >
                Sign In here →
              </button>
            </p>

            <p className="kg-auth-terms-note">
              By registering, you agree to KhelGrid’s <a href="/terms">Terms of Use</a>,{' '}
              <a href="/privacy">Privacy Policy</a>, and Grassroots Host Agreement.
            </p>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {tab === 'forgot_password' && !emailVerificationPending && (
          <form className="kg-auth-form" onSubmit={handleForgotPasswordSubmit}>
            <h2 id="kg-auth-title" className="kg-auth-title">
              Reset Your Password
            </h2>
            <p className="kg-auth-subtitle">
              Enter the email address registered with your KhelGrid account. We will email you
              instructions to reset your password.
            </p>

            <div className="kg-auth-field">
              <label htmlFor={emailInputId}>Registered Email Address</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="mail" size={16} className="kg-input-icon" />
                <input
                  id={emailInputId}
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
              {submitting ? 'Sending Instructions…' : 'Send Reset Instructions'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                className="kg-text-link"
                onClick={() => setTab('login')}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* TAB: SET NEW PASSWORD */}
        {tab === 'set_new_password' && (
          <form className="kg-auth-form" onSubmit={handleSetNewPasswordSubmit}>
            <h2 id="kg-auth-title" className="kg-auth-title">
              Create a New Password
            </h2>
            <p className="kg-auth-subtitle">
              Enter and confirm your new secure password below (minimum 6 characters) to update your KhelGrid account.
            </p>

            <div className="kg-auth-field">
              <label htmlFor="kg-new-password">New Password</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
                <input
                  id="kg-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="kg-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <SiteIcon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
            </div>

            <div className="kg-auth-field">
              <label htmlFor="kg-confirm-password">Confirm New Password</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
                <input
                  id="kg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
              {submitting ? 'Updating Password…' : 'Save New Password & Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                className="kg-text-link"
                onClick={() => setTab('login')}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: EXPIRED LINK / RESEND VERIFICATION */}
        {tab === 'expired_link' && !emailVerificationPending && (
          <form className="kg-auth-form" onSubmit={handleResendVerification}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: '#fef2f2', color: '#dc2626' }}>
                <SiteIcon name="alert-circle" size={28} />
              </span>
            </div>
            <h2 id="kg-auth-title" className="kg-auth-title" style={{ textAlign: 'center' }}>
              Verification Link Expired
            </h2>
            <p className="kg-auth-subtitle" style={{ textAlign: 'center' }}>
              Email links expire after 1 hour or when pre-scanned by email security filters. Enter your registered email to receive a fresh verification link.
            </p>

            <div className="kg-auth-field">
              <label htmlFor={emailInputId}>Your Registered Email</label>
              <div className="kg-auth-input-wrap">
                <SiteIcon name="mail" size={16} className="kg-input-icon" />
                <input
                  id={emailInputId}
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
              {submitting ? 'Sending Fresh Link…' : 'Resend Verification Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="kg-text-link"
                onClick={() => {
                  setTab('login')
                  setErrorMsg('')
                }}
              >
                Already verified? Sign in with password
              </button>
              <button
                type="button"
                className="kg-text-link"
                onClick={() => {
                  setTab('signup')
                  setErrorMsg('')
                }}
              >
                Need to create a new account? Register here
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
