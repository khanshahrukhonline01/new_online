import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  resendVerificationEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogleOAuth,
  signUpWithEmail,
  updatePassword,
  verifyEmailOtpCode,
  type AuthAgeBand,
  type AuthUserProfile,
  type UserRole,
} from '../../integrations/supabase/auth-client'
import { useFormState } from '../hooks/useFormState'
import { AuthPartnerHandoffPanel } from './auth/AuthPartnerHandoffPanel'
import { AuthRecoveryAndOtpPanel } from './auth/AuthRecoveryAndOtpPanel'
import { AuthStepIdentityPanel } from './auth/AuthStepIdentityPanel'
import { AuthStepProfilePanel } from './auth/AuthStepProfilePanel'
import {
  resolvePostAuthTarget,
  type AuthModalTab,
  type OnboardingStep,
} from './auth/authModalTypes'
import './AuthModal.css'

export type { AuthModalTab } from './auth/authModalTypes'

export interface AuthModalProps {
  isOpen: boolean
  initialTab?: AuthModalTab
  initialError?: string
  initialEmail?: string
  intentLabel?: string
  redirectTo?: string
  onClose: () => void
  onSuccess?: (user: AuthUserProfile, options?: { skipRedirect?: boolean }) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

interface AuthModalFields extends Record<string, unknown> {
  email: string
  password: string
  newPassword: string
  confirmPassword: string
  otpCode: string
  fullName: string
  role: Extract<UserRole, 'athlete' | 'parent' | 'scout'>
  city: string
  phone: string
  ageBand: AuthAgeBand
  guardianEmail: string
  guardianConsentAccepted: boolean
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function AuthModal({
  isOpen,
  initialTab = 'login',
  initialError,
  initialEmail,
  intentLabel,
  redirectTo,
  onClose,
  onSuccess,
  onNavigate,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthModalTab>(initialTab)
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('identity')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(initialError || '')
  const [successMsg, setSuccessMsg] = useState('')
  const [emailVerificationPending, setEmailVerificationPending] = useState(false)

  const form = useFormState<AuthModalFields>({
    email: initialEmail || '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    otpCode: '',
    fullName: '',
    role: 'athlete',
    city: 'Delhi NCR',
    phone: '',
    ageBand: 'adult',
    guardianEmail: '',
    guardianConsentAccepted: false,
  })

  const cardRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setTab(initialTab)
    setOnboardingStep('identity')
    setErrorMsg(initialError || '')
    if (initialEmail) {
      form.setField('email', initialEmail)
    }
    setSuccessMsg('')
    setEmailVerificationPending(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab, initialError, initialEmail, isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (typeof document !== 'undefined') {
      triggerRef.current = document.activeElement
      requestAnimationFrame(() => closeBtnRef.current?.focus())
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !cardRef.current) return
      const focusable = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter(el => !el.closest('[hidden]') && el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (triggerRef.current && (triggerRef.current as HTMLElement).focus) {
        ;(triggerRef.current as HTMLElement).focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const finishAuthNavigation = (user: AuthUserProfile) => {
    const target = resolvePostAuthTarget(user, redirectTo)
    onSuccess?.(user, { skipRedirect: Boolean(target) })
    setTimeout(() => {
      onClose()
      if (target) {
        onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, target)
      }
    }, 500)
  }

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)
    try {
      const res = await signInWithEmail({
        email: form.fields.email,
        password: form.fields.password,
        redirectTo,
      })
      if (res.success && res.user) {
        setSuccessMsg(`Welcome back, ${res.user.fullName}!`)
        finishAuthNavigation(res.user)
      } else if (res.requiresEmailVerification) {
        setEmailVerificationPending(true)
        setSuccessMsg(`Magic login link and 6-digit code sent to ${form.fields.email}.`)
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
    if (!form.fields.email.trim() || !form.fields.email.includes('@')) {
      setErrorMsg('Please enter a valid email address first to receive a magic link.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)
    try {
      const res = await signInWithEmail({
        email: form.fields.email,
        useMagicLink: true,
        redirectTo,
      })
      if (res.success) {
        setEmailVerificationPending(true)
        setSuccessMsg(`Magic sign-in link and code sent to ${form.fields.email.trim()}.`)
      } else {
        setErrorMsg(res.message || 'Could not send magic link.')
      }
    } catch {
      setErrorMsg('Failed to send magic link.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)
    try {
      const res = await signInWithGoogleOAuth(redirectTo)
      if (!res.success) {
        setErrorMsg(res.message || 'Google Sign-In could not be started.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdvanceSignupStep = (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!form.fields.email.trim() || !form.fields.email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }
    if (!form.fields.password || form.fields.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }
    setOnboardingStep('profile')
  }

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const isMinorAthlete =
      form.fields.role === 'athlete' &&
      (form.fields.ageBand === 'u14' || form.fields.ageBand === 'u16' || form.fields.ageBand === 'u18')

    if (isMinorAthlete && (!form.fields.guardianEmail.trim() || !form.fields.guardianConsentAccepted)) {
      setErrorMsg('Under-18 athlete accounts require a parent/guardian email and DPDP consent confirmation.')
      return
    }

    setSubmitting(true)
    try {
      const derivedName = form.fields.fullName.trim() || form.fields.email.split('@')[0] || 'KhelGrid Athlete'
      const res = await signUpWithEmail({
        email: form.fields.email,
        password: form.fields.password,
        fullName: derivedName,
        role: form.fields.role,
        city: form.fields.city || 'Delhi NCR',
        phone: form.fields.phone,
        ageBand: form.fields.role === 'athlete' ? form.fields.ageBand : undefined,
        guardianEmail: isMinorAthlete ? form.fields.guardianEmail : undefined,
        redirectTo,
      })
      if (res.success) {
        if (res.requiresEmailVerification) {
          setEmailVerificationPending(true)
          setSuccessMsg(`Verification link & 6-digit code sent to ${form.fields.email}.`)
        } else if (res.user) {
          setSuccessMsg(`Account created! Welcome, ${res.user.fullName}.`)
          finishAuthNavigation(res.user)
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

  const handleVerifyOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)
    try {
      const res = await verifyEmailOtpCode({
        email: form.fields.email,
        token: form.fields.otpCode,
        type: 'email',
      })
      if (res.success && res.user) {
        setEmailVerificationPending(false)
        setSuccessMsg(`Verified! Welcome, ${res.user.fullName}.`)
        finishAuthNavigation(res.user)
      } else {
        setErrorMsg(res.message || 'Could not verify code.')
      }
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
      const res = await sendPasswordReset(form.fields.email, redirectTo)
      if (res.success) {
        setSuccessMsg(res.message)
      } else {
        setErrorMsg(res.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.fields.newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }
    if (form.fields.newPassword !== form.fields.confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)
    try {
      const res = await updatePassword(form.fields.newPassword)
      if (res.success) {
        setSuccessMsg(res.message || 'Password updated successfully! You can now sign in.')
        setTimeout(() => {
          setTab('login')
          form.setField('password', '')
          form.setField('newPassword', '')
          form.setField('confirmPassword', '')
        }, 1200)
      } else {
        setErrorMsg(res.message || 'Could not update password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendVerification = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!form.fields.email.trim() || !form.fields.email.includes('@')) {
      setErrorMsg('Please enter your email address to receive a fresh verification link.')
      return
    }
    setErrorMsg('')
    setSuccessMsg('')
    setSubmitting(true)
    try {
      const res = await resendVerificationEmail(form.fields.email.trim())
      if (res.success) {
        setSuccessMsg(res.message)
        setEmailVerificationPending(true)
      } else {
        setErrorMsg(res.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePartnerRoute = (
    partnerRole: 'academy' | 'coach' | 'venue' | 'tournament',
    e: MouseEvent<HTMLAnchorElement>
  ) => {
    onClose()
    onNavigate?.(e, `/partner-signup?role=${partnerRole}&mode=signup`)
  }

  const recoveryView = emailVerificationPending
    ? 'otp_pending'
    : tab === 'forgot_password' || tab === 'expired_link' || tab === 'set_new_password'
      ? tab
      : null

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
            ref={closeBtnRef}
            type="button"
            className="kg-auth-close-btn"
            onClick={onClose}
            aria-label="Close authentication dialog"
          >
            <SiteIcon name="close" size={17} />
          </button>
        </div>

        {intentLabel && (
          <div className="kg-auth-intent-banner" role="status">
            <SiteIcon name="target" size={15} />
            <span>{intentLabel}</span>
          </div>
        )}

        <div className="kg-auth-tabs has-two-tabs" role="tablist" aria-label="Sign in or register">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login' && !emailVerificationPending}
            className={`kg-auth-tab ${tab === 'login' && !emailVerificationPending ? 'is-active' : ''}`}
            onClick={() => {
              setTab('login')
              setOnboardingStep('identity')
              setEmailVerificationPending(false)
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
            aria-selected={tab === 'signup' && !emailVerificationPending}
            className={`kg-auth-tab ${tab === 'signup' && !emailVerificationPending ? 'is-active' : ''}`}
            onClick={() => {
              setTab('signup')
              setOnboardingStep('identity')
              setEmailVerificationPending(false)
              setErrorMsg('')
              setSuccessMsg('')
            }}
          >
            <SiteIcon name="plus" size={14} />
            <span>Create Account</span>
          </button>
        </div>

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

        {recoveryView && (
          <AuthRecoveryAndOtpPanel
            view={recoveryView}
            email={form.fields.email}
            otpCode={form.fields.otpCode}
            newPassword={form.fields.newPassword}
            confirmPassword={form.fields.confirmPassword}
            showPassword={showPassword}
            submitting={submitting}
            onEmailChange={v => form.setField('email', v)}
            onOtpCodeChange={v => form.setField('otpCode', v)}
            onNewPasswordChange={v => form.setField('newPassword', v)}
            onConfirmPasswordChange={v => form.setField('confirmPassword', v)}
            onTogglePassword={() => setShowPassword(s => !s)}
            onVerifyOtpSubmit={handleVerifyOtpSubmit}
            onForgotSubmit={handleForgotPasswordSubmit}
            onResendSubmit={handleResendVerification}
            onSetNewPasswordSubmit={handleSetNewPasswordSubmit}
            onBackToLogin={() => {
              setEmailVerificationPending(false)
              setTab('login')
              setErrorMsg('')
            }}
            onSwitchToSignup={() => {
              setEmailVerificationPending(false)
              setTab('signup')
              setOnboardingStep('identity')
              setErrorMsg('')
            }}
            onSwitchToOtpEntry={() => {
              setEmailVerificationPending(true)
              setErrorMsg('')
            }}
          />
        )}

        {!recoveryView && tab === 'partner' && (
          <AuthPartnerHandoffPanel
            onSelectPartnerRole={handlePartnerRoute}
            onSwitchToLogin={() => {
              setTab('login')
              setErrorMsg('')
            }}
          />
        )}

        {!recoveryView && (tab === 'login' || (tab === 'signup' && onboardingStep === 'identity')) && (
          <AuthStepIdentityPanel
            mode={tab === 'signup' ? 'signup' : 'login'}
            email={form.fields.email}
            password={form.fields.password}
            showPassword={showPassword}
            submitting={submitting}
            errorMsg={errorMsg}
            onEmailChange={v => form.setField('email', v)}
            onPasswordChange={v => form.setField('password', v)}
            onTogglePassword={() => setShowPassword(s => !s)}
            onLoginSubmit={handleLoginSubmit}
            onMagicLinkSubmit={handleMagicLinkSubmit}
            onGoogleSignIn={() => void handleGoogleSignIn()}
            onAdvanceSignupStep={handleAdvanceSignupStep}
            onGoToForgotPassword={() => {
              setTab('forgot_password')
              setErrorMsg('')
            }}
            onGoToExpiredLink={() => {
              setTab('expired_link')
              setErrorMsg('')
            }}
            onNavigatePartner={handlePartnerRoute}
          />
        )}

        {!recoveryView && tab === 'signup' && onboardingStep === 'profile' && (
          <AuthStepProfilePanel
            email={form.fields.email}
            role={form.fields.role}
            fullName={form.fields.fullName}
            city={form.fields.city}
            phone={form.fields.phone}
            ageBand={form.fields.ageBand}
            guardianEmail={form.fields.guardianEmail}
            guardianConsentAccepted={form.fields.guardianConsentAccepted}
            submitting={submitting}
            onRoleChange={r => form.setField('role', r)}
            onFullNameChange={v => form.setField('fullName', v)}
            onCityChange={v => form.setField('city', v)}
            onPhoneChange={v => form.setField('phone', v)}
            onAgeBandChange={b => form.setField('ageBand', b)}
            onGuardianEmailChange={v => form.setField('guardianEmail', v)}
            onGuardianConsentChange={checked => form.setField('guardianConsentAccepted', checked)}
            onBackStep={() => setOnboardingStep('identity')}
            onSubmitSignUp={handleSignUpSubmit}
            onNavigatePartner={handlePartnerRoute}
          />
        )}
      </div>
    </div>
  )
}
