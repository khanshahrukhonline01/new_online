import { useCallback, useEffect, useState, type FormEvent, type MouseEvent } from 'react'
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
} from '../../../integrations/supabase/auth-client'
import {
  isMinorAgeBand,
  type AuthConsumerRole,
  type AuthModalTab,
  type AuthOnboardingStep,
  type AuthPartnerRole,
} from './authModalTypes'

export interface UseAuthModalControllerParams {
  isOpen: boolean
  initialTab: AuthModalTab
  initialError?: string
  initialEmail?: string
  redirectTo?: string
  onClose: () => void
  onSuccess?: (user: AuthUserProfile, options?: { skipRedirect?: boolean }) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export interface AuthFormFields {
  email: string
  password: string
  otpCode: string
  newPassword: string
  confirmPassword: string
  role: AuthConsumerRole
  fullName: string
  city: string
  phone: string
  ageBand: AuthAgeBand
  guardianEmail: string
  guardianConsentAccepted: boolean
}

const DEFAULT_FIELDS: AuthFormFields = {
  email: '',
  password: '',
  otpCode: '',
  newPassword: '',
  confirmPassword: '',
  role: 'athlete',
  fullName: '',
  city: '',
  phone: '',
  ageBand: 'adult',
  guardianEmail: '',
  guardianConsentAccepted: false,
}

export function useAuthModalController({
  isOpen,
  initialTab,
  initialError,
  initialEmail,
  redirectTo,
  onClose,
  onSuccess,
  onNavigate,
}: UseAuthModalControllerParams) {
  const [tab, setTab] = useState<AuthModalTab>(initialTab)
  const [onboardingStep, setOnboardingStep] = useState<AuthOnboardingStep>('identity')
  const [emailVerificationPending, setEmailVerificationPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError || null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [fields, setFields] = useState<AuthFormFields>(() => ({
    ...DEFAULT_FIELDS,
    email: initialEmail || '',
  }))

  useEffect(() => {
    if (!isOpen) return
    setTab(initialTab)
    setOnboardingStep('identity')
    setEmailVerificationPending(false)
    setErrorMsg(initialError || null)
    setSuccessMsg(null)
    if (initialEmail) {
      setFields(prev => ({ ...prev, email: initialEmail }))
    }
  }, [isOpen, initialTab, initialError, initialEmail])

  const setField = useCallback(
    <K extends keyof AuthFormFields>(key: K, value: AuthFormFields[K]) => {
      setFields(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  const switchTab = useCallback((nextTab: AuthModalTab) => {
    setTab(nextTab)
    setOnboardingStep('identity')
    setEmailVerificationPending(false)
    setErrorMsg(null)
    setSuccessMsg(null)
  }, [])

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const setPendingVerification = useCallback((pending: boolean) => {
    setEmailVerificationPending(pending)
    setErrorMsg(null)
  }, [])

  const handlePartnerRoute = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, role: AuthPartnerRole, mode: 'signup' | 'login' = 'signup') => {
      const target = `/partner-signup?role=${role}&mode=${mode}`
      onClose()
      if (onNavigate) {
        onNavigate(event, target)
      }
    },
    [onClose, onNavigate],
  )

  const handleLoginSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      setSuccessMsg(null)
      if (!fields.email.trim() || !fields.password) {
        setErrorMsg('Please enter both your email address and password.')
        return
      }
      setSubmitting(true)
      try {
        const res = await signInWithEmail({
          email: fields.email.trim(),
          password: fields.password,
        })
        if (res.success && res.user) {
          onSuccess?.(res.user)
          onClose()
        } else {
          setErrorMsg(res.message || 'Sign in failed. Please check your credentials.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [fields.email, fields.password, onClose, onSuccess],
  )

  const handleMagicLinkSubmit = useCallback(async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!fields.email.trim()) {
      setErrorMsg('Enter your email address first to receive a 1-click sign-in link or 6-digit code.')
      return
    }
    setSubmitting(true)
    try {
      const res = await resendVerificationEmail(fields.email.trim())
      if (res.success) {
        setSuccessMsg(res.message || 'Verification code sent to your inbox.')
        setEmailVerificationPending(true)
      } else {
        setErrorMsg(res.message || 'Could not send login code right now.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [fields.email])

  const handleGoogleSignIn = useCallback(async () => {
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const res = await signInWithGoogleOAuth(redirectTo)
      if (!res.success) {
        setErrorMsg(res.message || 'Google sign-in is currently unavailable.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [redirectTo])

  const handleAdvanceSignupStep = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      if (!fields.email.trim() || !fields.email.includes('@')) {
        setErrorMsg('Please enter a valid email address.')
        return
      }
      if (fields.password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.')
        return
      }
      setOnboardingStep('profile')
    },
    [fields.email, fields.password],
  )

  const handleSignUpSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      setSuccessMsg(null)
      if (!fields.fullName.trim()) {
        setErrorMsg('Please enter your full name.')
        return
      }
      const minor = fields.role === 'athlete' && isMinorAgeBand(fields.ageBand)
      if (minor) {
        if (!fields.guardianEmail.trim() || !fields.guardianEmail.includes('@')) {
          setErrorMsg('Parent / Legal Guardian email is required under DPDP Act 2023 for athletes under 18.')
          return
        }
        if (!fields.guardianConsentAccepted) {
          setErrorMsg('Please confirm parental or legal guardian consent to continue.')
          return
        }
      }
      setSubmitting(true)
      try {
        const res = await signUpWithEmail({
          email: fields.email.trim(),
          password: fields.password,
          fullName: fields.fullName.trim(),
          role: fields.role,
          city: fields.city.trim() || undefined,
          phone: fields.phone.trim() || undefined,
          ageBand: fields.ageBand,
          guardianEmail: minor ? fields.guardianEmail.trim() : undefined,
        })
        if (res.success && res.user) {
          if (res.requiresEmailVerification) {
            setSuccessMsg(res.message || 'Check your inbox for your 6-digit verification code.')
            setEmailVerificationPending(true)
          } else {
            onSuccess?.(res.user)
            onClose()
          }
        } else {
          setErrorMsg(res.message || 'Could not complete registration.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [fields, onClose, onSuccess],
  )

  const handleVerifyOtpSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      if (!fields.email.trim() || fields.otpCode.trim().length < 6) {
        setErrorMsg('Enter the 6-digit verification code sent to your email.')
        return
      }
      setSubmitting(true)
      try {
        const res = await verifyEmailOtpCode({
          email: fields.email.trim(),
          token: fields.otpCode.trim(),
        })
        if (res.success && res.user) {
          onSuccess?.(res.user)
          onClose()
        } else {
          setErrorMsg(res.message || 'Invalid or expired 6-digit verification code.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [fields.email, fields.otpCode, onClose, onSuccess],
  )

  const handleForgotPasswordSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      setSuccessMsg(null)
      if (!fields.email.trim()) {
        setErrorMsg('Please enter the email associated with your account.')
        return
      }
      setSubmitting(true)
      try {
        const res = await sendPasswordReset(fields.email.trim())
        if (res.success) {
          setSuccessMsg(res.message || 'Password reset instructions have been sent to your email.')
        } else {
          setErrorMsg(res.message || 'Unable to send password reset instructions.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [fields.email],
  )

  const handleResendVerification = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      setErrorMsg(null)
      setSuccessMsg(null)
      if (!fields.email.trim()) {
        setErrorMsg('Please enter your email address first.')
        return
      }
      setSubmitting(true)
      try {
        const res = await resendVerificationEmail(fields.email.trim())
        if (res.success) {
          setSuccessMsg(res.message || 'Fresh verification email sent.')
        } else {
          setErrorMsg(res.message || 'Could not resend verification email.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [fields.email],
  )

  const handleSetNewPasswordSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      setSuccessMsg(null)
      if (fields.newPassword.length < 8) {
        setErrorMsg('New password must be at least 8 characters long.')
        return
      }
      if (fields.newPassword !== fields.confirmPassword) {
        setErrorMsg('Passwords do not match.')
        return
      }
      setSubmitting(true)
      try {
        const res = await updatePassword(fields.newPassword)
        if (res.success) {
          setSuccessMsg('Password updated successfully. You can now sign in.')
          setTab('login')
        } else {
          setErrorMsg(res.message || 'Unable to update password.')
        }
      } finally {
        setSubmitting(false)
      }
    },
    [fields.confirmPassword, fields.newPassword],
  )

  return {
    ui: {
      tab,
      onboardingStep,
      emailVerificationPending,
      showPassword,
      submitting,
      errorMsg,
      successMsg,
    },
    form: {
      fields,
      setField,
    },
    switchTab,
    setOnboardingStep,
    setPendingVerification,
    toggleShowPassword,
    handlePartnerRoute,
    handleLoginSubmit,
    handleMagicLinkSubmit,
    handleGoogleSignIn,
    handleAdvanceSignupStep,
    handleSignUpSubmit,
    handleVerifyOtpSubmit,
    handleForgotPasswordSubmit,
    handleResendVerification,
    handleSetNewPasswordSubmit,
  }
}
