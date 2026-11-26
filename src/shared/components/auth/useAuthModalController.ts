import { useCallback, useEffect, useReducer, type FormEvent, type MouseEvent } from 'react'
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
  acceptTenantInvitation,
  getPendingTenantMemberships,
  resolveTenantWorkspacePath,
  tryFetchUserTenantMemberships,
  type DbTenantMembership,
} from '../../../integrations/supabase/tenant-client'
import { useFormState } from '../../hooks/useFormState'
import {
  resolvePostAuthTarget,
  type AuthModalTab,
  type ConsumerRole,
  type OnboardingStep,
  type PartnerHandoffRole,
} from './authModalTypes'

export interface AuthModalFields extends Record<string, unknown> {
  email: string
  password: string
  newPassword: string
  confirmPassword: string
  otpCode: string
  fullName: string
  role: ConsumerRole
  city: string
  phone: string
  ageBand: AuthAgeBand
  guardianEmail: string
  guardianConsentAccepted: boolean
}

export interface AuthUiState {
  tab: AuthModalTab
  onboardingStep: OnboardingStep
  showPassword: boolean
  submitting: boolean
  errorMsg: string
  successMsg: string
  emailVerificationPending: boolean
  resolvedUser: AuthUserProfile | null
  resolvedMemberships: DbTenantMembership[]
  pendingInvitations: DbTenantMembership[]
}

type AuthUiAction =
  | { type: 'SYNC_OPEN'; tab: AuthModalTab; errorMsg: string }
  | { type: 'SWITCH_TAB'; tab: AuthModalTab }
  | { type: 'SET_STEP'; step: OnboardingStep }
  | { type: 'TOGGLE_PASSWORD' }
  | { type: 'START_SUBMIT' }
  | { type: 'FINISH_SUBMIT' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_SUCCESS'; message: string; pendingVerification?: boolean }
  | { type: 'SET_PENDING_VERIFICATION'; pending: boolean }
  | {
      type: 'SET_TENANT_PICKER'
      user: AuthUserProfile
      memberships: DbTenantMembership[]
      pendingInvitations: DbTenantMembership[]
      message: string
    }

function authUiReducer(state: AuthUiState, action: AuthUiAction): AuthUiState {
  switch (action.type) {
    case 'SYNC_OPEN':
      return {
        ...state,
        tab: action.tab,
        onboardingStep: 'identity',
        errorMsg: action.errorMsg,
        successMsg: '',
        emailVerificationPending: false,
        resolvedUser: null,
        resolvedMemberships: [],
        pendingInvitations: [],
      }
    case 'SWITCH_TAB':
      return {
        ...state,
        tab: action.tab,
        onboardingStep: 'identity',
        emailVerificationPending: false,
        errorMsg: '',
        successMsg: '',
        resolvedUser: null,
        resolvedMemberships: [],
        pendingInvitations: [],
      }
    case 'SET_STEP':
      return { ...state, onboardingStep: action.step, errorMsg: '' }
    case 'TOGGLE_PASSWORD':
      return { ...state, showPassword: !state.showPassword }
    case 'START_SUBMIT':
      return { ...state, submitting: true, errorMsg: '', successMsg: '' }
    case 'FINISH_SUBMIT':
      return { ...state, submitting: false }
    case 'SET_ERROR':
      return { ...state, submitting: false, errorMsg: action.message }
    case 'SET_SUCCESS':
      return {
        ...state,
        submitting: false,
        successMsg: action.message,
        emailVerificationPending:
          action.pendingVerification ?? state.emailVerificationPending,
      }
    case 'SET_PENDING_VERIFICATION':
      return {
        ...state,
        emailVerificationPending: action.pending,
        errorMsg: '',
      }
    case 'SET_TENANT_PICKER':
      return {
        ...state,
        submitting: false,
        onboardingStep: 'tenant_picker',
        emailVerificationPending: false,
        errorMsg: '',
        successMsg: action.message,
        resolvedUser: action.user,
        resolvedMemberships: action.memberships,
        pendingInvitations: action.pendingInvitations,
      }
    default:
      return state
  }
}

interface UseAuthModalControllerParams {
  isOpen: boolean
  initialTab: AuthModalTab
  initialError?: string
  initialEmail?: string
  redirectTo?: string
  onClose: () => void
  onSuccess?: (user: AuthUserProfile, options?: { skipRedirect?: boolean }) => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

/**
 * Coordinates reduced AuthModal UI state, typed form fields via `useFormState`,
 * Supabase auth actions, 6-digit OTP verification, Google OAuth, and return-path navigation.
 */
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
  const [ui, dispatch] = useReducer(authUiReducer, {
    tab: initialTab,
    onboardingStep: 'identity',
    showPassword: false,
    submitting: false,
    errorMsg: initialError || '',
    successMsg: '',
    emailVerificationPending: false,
    resolvedUser: null,
    resolvedMemberships: [],
    pendingInvitations: [],
  })

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

  useEffect(() => {
    dispatch({
      type: 'SYNC_OPEN',
      tab: initialTab,
      errorMsg: initialError || '',
    })
    if (initialEmail) {
      form.setField('email', initialEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab, initialError, initialEmail, isOpen])

  const finishAuthNavigation = useCallback(
    (user: AuthUserProfile, explicitTarget?: string | null) => {
      const target = explicitTarget ?? resolvePostAuthTarget(user, redirectTo)
      onSuccess?.(user, { skipRedirect: Boolean(target) })
      setTimeout(() => {
        onClose()
        if (target) {
          onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, target)
        }
      }, 500)
    },
    [onClose, onNavigate, onSuccess, redirectTo]
  )

  const completeSignInWithMemberships = useCallback(
    async (user: AuthUserProfile, welcomeMessage: string) => {
      const [memberships, pendingInvites] = await Promise.all([
        tryFetchUserTenantMemberships(user.id),
        getPendingTenantMemberships(user.id),
      ])

      if (!redirectTo && (memberships.length > 1 || pendingInvites.length > 0)) {
        onSuccess?.(user, { skipRedirect: true })
        dispatch({
          type: 'SET_TENANT_PICKER',
          user,
          memberships,
          pendingInvitations: pendingInvites,
          message: welcomeMessage,
        })
        return
      }

      const target = resolvePostAuthTarget(user, redirectTo, memberships)
      dispatch({ type: 'SET_SUCCESS', message: welcomeMessage, pendingVerification: false })
      finishAuthNavigation(user, target)
    },
    [finishAuthNavigation, onSuccess, redirectTo]
  )

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await signInWithEmail({
        email: form.fields.email,
        password: form.fields.password,
        redirectTo,
      })
      if (res.success && res.user) {
        await completeSignInWithMemberships(res.user, `Welcome back, ${res.user.fullName}!`)
      } else if (res.requiresEmailVerification) {
        dispatch({
          type: 'SET_SUCCESS',
          message: `Magic login link and 6-digit code sent to ${form.fields.email}.`,
          pendingVerification: true,
        })
      } else {
        dispatch({
          type: 'SET_ERROR',
          message: res.message || 'Login failed. Please check your credentials.',
        })
      }
    } catch {
      dispatch({
        type: 'SET_ERROR',
        message: 'An unexpected connection error occurred. Please try again.',
      })
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleMagicLinkSubmit = async () => {
    if (!form.fields.email.trim() || !form.fields.email.includes('@')) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Please enter a valid email address first to receive a magic link.',
      })
      return
    }
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await signInWithEmail({
        email: form.fields.email,
        useMagicLink: true,
        redirectTo,
      })
      if (res.success) {
        dispatch({
          type: 'SET_SUCCESS',
          message: `Magic sign-in link and code sent to ${form.fields.email.trim()}.`,
          pendingVerification: true,
        })
      } else {
        dispatch({ type: 'SET_ERROR', message: res.message || 'Could not send magic link.' })
      }
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Failed to send magic link.' })
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleGoogleSignIn = async () => {
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await signInWithGoogleOAuth(redirectTo)
      if (!res.success) {
        dispatch({
          type: 'SET_ERROR',
          message: res.message || 'Google Sign-In could not be started.',
        })
      }
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleAdvanceSignupStep = (e: FormEvent) => {
    e.preventDefault()
    if (!form.fields.email.trim() || !form.fields.email.includes('@')) {
      dispatch({ type: 'SET_ERROR', message: 'Please enter a valid email address.' })
      return
    }
    if (!form.fields.password || form.fields.password.length < 6) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Password must be at least 6 characters long.',
      })
      return
    }
    dispatch({ type: 'SET_STEP', step: 'profile' })
  }

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const isMinorAthlete =
      form.fields.role === 'athlete' &&
      (form.fields.ageBand === 'u14' ||
        form.fields.ageBand === 'u16' ||
        form.fields.ageBand === 'u18')

    if (
      isMinorAthlete &&
      (!form.fields.guardianEmail.trim() || !form.fields.guardianConsentAccepted)
    ) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Under-18 athlete accounts require a parent/guardian email and DPDP consent confirmation.',
      })
      return
    }

    dispatch({ type: 'START_SUBMIT' })
    try {
      const derivedName =
        form.fields.fullName.trim() ||
        form.fields.email.split('@')[0] ||
        'KhelGrid Athlete'
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
          dispatch({
            type: 'SET_SUCCESS',
            message: `Verification link & 6-digit code sent to ${form.fields.email}.`,
            pendingVerification: true,
          })
        } else if (res.user) {
          dispatch({
            type: 'SET_SUCCESS',
            message: `Account created! Welcome, ${res.user.fullName}.`,
          })
          finishAuthNavigation(res.user)
        }
      } else {
        dispatch({
          type: 'SET_ERROR',
          message: res.message || 'Registration could not be completed.',
        })
      }
    } catch {
      dispatch({
        type: 'SET_ERROR',
        message: 'Could not register account. Please try again.',
      })
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleVerifyOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await verifyEmailOtpCode({
        email: form.fields.email,
        token: form.fields.otpCode,
        type: 'email',
      })
      if (res.success && res.user) {
        await completeSignInWithMemberships(res.user, `Verified! Welcome, ${res.user.fullName}.`)
      } else {
        dispatch({ type: 'SET_ERROR', message: res.message || 'Could not verify code.' })
      }
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await sendPasswordReset(form.fields.email, redirectTo)
      if (res.success) {
        dispatch({ type: 'SET_SUCCESS', message: res.message })
      } else {
        dispatch({ type: 'SET_ERROR', message: res.message })
      }
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleSetNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.fields.newPassword.length < 6) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Password must be at least 6 characters long.',
      })
      return
    }
    if (form.fields.newPassword !== form.fields.confirmPassword) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Passwords do not match. Please verify and try again.',
      })
      return
    }
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await updatePassword(form.fields.newPassword)
      if (res.success) {
        dispatch({
          type: 'SET_SUCCESS',
          message: res.message || 'Password updated successfully! You can now sign in.',
        })
        setTimeout(() => {
          dispatch({ type: 'SWITCH_TAB', tab: 'login' })
          form.setField('password', '')
          form.setField('newPassword', '')
          form.setField('confirmPassword', '')
        }, 1200)
      } else {
        dispatch({
          type: 'SET_ERROR',
          message: res.message || 'Could not update password.',
        })
      }
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleResendVerification = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!form.fields.email.trim() || !form.fields.email.includes('@')) {
      dispatch({
        type: 'SET_ERROR',
        message: 'Please enter your email address to receive a fresh verification link.',
      })
      return
    }
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await resendVerificationEmail(form.fields.email.trim())
      if (res.success) {
        dispatch({
          type: 'SET_SUCCESS',
          message: res.message,
          pendingVerification: true,
        })
      } else {
        dispatch({ type: 'SET_ERROR', message: res.message })
      }
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handleSelectTenantTarget = (target: string, e?: MouseEvent<HTMLAnchorElement>) => {
    onClose()
    onNavigate?.((e || undefined) as unknown as MouseEvent<HTMLAnchorElement>, target)
  }

  const handleAcceptModalInvitation = async (invite: DbTenantMembership) => {
    dispatch({ type: 'START_SUBMIT' })
    try {
      const res = await acceptTenantInvitation(invite.id)
      if (!res.success) {
        dispatch({ type: 'SET_ERROR', message: res.message })
        return
      }
      const nextTarget = resolveTenantWorkspacePath(invite)
      if (ui.resolvedUser) {
        const [memberships, pendingInvites] = await Promise.all([
          tryFetchUserTenantMemberships(ui.resolvedUser.id),
          getPendingTenantMemberships(ui.resolvedUser.id),
        ])
        dispatch({
          type: 'SET_TENANT_PICKER',
          user: ui.resolvedUser,
          memberships,
          pendingInvitations: pendingInvites,
          message: `Joined ${invite.tenant?.name || 'workspace'}!`,
        })
      }
      onClose()
      onNavigate?.(undefined as unknown as MouseEvent<HTMLAnchorElement>, nextTarget)
    } finally {
      dispatch({ type: 'FINISH_SUBMIT' })
    }
  }

  const handlePartnerRoute = (
    partnerRole: PartnerHandoffRole,
    e: MouseEvent<HTMLAnchorElement>,
    mode: 'signup' | 'login' = 'signup'
  ) => {
    onClose()
    onNavigate?.(e, `/partner-signup?role=${partnerRole}&mode=${mode}`)
  }

  return {
    ui,
    form,
    switchTab: (tab: AuthModalTab) => dispatch({ type: 'SWITCH_TAB', tab }),
    setOnboardingStep: (step: OnboardingStep) => dispatch({ type: 'SET_STEP', step }),
    toggleShowPassword: () => dispatch({ type: 'TOGGLE_PASSWORD' }),
    setPendingVerification: (pending: boolean) =>
      dispatch({ type: 'SET_PENDING_VERIFICATION', pending }),
    handleLoginSubmit,
    handleMagicLinkSubmit,
    handleGoogleSignIn,
    handleAdvanceSignupStep,
    handleSignUpSubmit,
    handleVerifyOtpSubmit,
    handleForgotPasswordSubmit,
    handleSetNewPasswordSubmit,
    handleResendVerification,
    handlePartnerRoute,
    handleSelectTenantTarget,
    handleAcceptModalInvitation,
  }
}
