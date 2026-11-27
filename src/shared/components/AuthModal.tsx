import { useEffect, useRef, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import { AuthPartnerHandoffPanel } from './auth/AuthPartnerHandoffPanel'
import { AuthRecoveryAndOtpPanel } from './auth/AuthRecoveryAndOtpPanel'
import { AuthStepIdentityPanel } from './auth/AuthStepIdentityPanel'
import { AuthStepProfilePanel } from './auth/AuthStepProfilePanel'
import { AuthTenantPickerPanel } from './auth/AuthTenantPickerPanel'
import {
  resolvePostAuthTarget,
  type AuthModalTab,
} from './auth/authModalTypes'
import { useAuthModalController } from './auth/useAuthModalController'
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

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Accessible, progressive Intent-First authentication dialog featuring focus trapping,
 * Escape closing, trigger focus restoration, and dark-mode CSS custom property theming.
 */
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
  const controller = useAuthModalController({
    isOpen,
    initialTab,
    initialError,
    initialEmail,
    redirectTo,
    onClose,
    onSuccess,
    onNavigate,
  })

  const cardRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

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

  const { ui, form } = controller
  const showTenantPicker = ui.onboardingStep === 'tenant_picker' && Boolean(ui.resolvedUser)
  const recoveryView = ui.emailVerificationPending
    ? 'otp_pending'
    : ui.tab === 'forgot_password' || ui.tab === 'expired_link' || ui.tab === 'set_new_password'
      ? ui.tab
      : null

  const personalFallbackPath = ui.resolvedUser
    ? resolvePostAuthTarget(ui.resolvedUser, undefined, []) || '/workspace/athlete/overview'
    : '/workspace/athlete/overview'

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
            aria-selected={ui.tab === 'login' && !ui.emailVerificationPending}
            className={`kg-auth-tab ${ui.tab === 'login' && !ui.emailVerificationPending ? 'is-active' : ''}`}
            onClick={() => controller.switchTab('login')}
          >
            <SiteIcon name="user-round" size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={ui.tab === 'signup' && !ui.emailVerificationPending}
            className={`kg-auth-tab ${ui.tab === 'signup' && !ui.emailVerificationPending ? 'is-active' : ''}`}
            onClick={() => controller.switchTab('signup')}
          >
            <SiteIcon name="plus" size={14} />
            <span>Create Account</span>
          </button>
        </div>

        {ui.errorMsg && (
          <div className="kg-auth-alert kg-auth-alert-error" role="alert">
            <SiteIcon name="alert-circle" size={16} />
            <span>{ui.errorMsg}</span>
          </div>
        )}

        {ui.successMsg && (
          <div className="kg-auth-alert kg-auth-alert-success" role="status" aria-live="polite">
            <SiteIcon name="check-circle" size={16} />
            <span>{ui.successMsg}</span>
          </div>
        )}

        {showTenantPicker && ui.resolvedUser && (
          <AuthTenantPickerPanel
            user={ui.resolvedUser}
            memberships={ui.resolvedMemberships}
            pendingInvitations={ui.pendingInvitations}
            personalFallbackPath={personalFallbackPath}
            submitting={ui.submitting}
            onSelectTarget={controller.handleSelectTenantTarget}
            onAcceptInvitation={invite => void controller.handleAcceptModalInvitation(invite)}
          />
        )}

        {!showTenantPicker && recoveryView && (
          <AuthRecoveryAndOtpPanel
            view={recoveryView}
            email={form.fields.email}
            otpCode={form.fields.otpCode}
            newPassword={form.fields.newPassword}
            confirmPassword={form.fields.confirmPassword}
            showPassword={ui.showPassword}
            submitting={ui.submitting}
            captchaResetKey={ui.captchaResetKey}
            onEmailChange={v => form.setField('email', v)}
            onOtpCodeChange={v => form.setField('otpCode', v)}
            onNewPasswordChange={v => form.setField('newPassword', v)}
            onConfirmPasswordChange={v => form.setField('confirmPassword', v)}
            onTogglePassword={controller.toggleShowPassword}
            onVerifyOtpSubmit={controller.handleVerifyOtpSubmit}
            onForgotSubmit={controller.handleForgotPasswordSubmit}
            onResendSubmit={controller.handleResendVerification}
            onSetNewPasswordSubmit={controller.handleSetNewPasswordSubmit}
            onBackToLogin={() => controller.switchTab('login')}
            onSwitchToSignup={() => controller.switchTab('signup')}
            onSwitchToOtpEntry={() => controller.setPendingVerification(true)}
            onCaptchaTokenChange={t => form.setField('captchaToken', t)}
          />
        )}

        {!showTenantPicker && !recoveryView && ui.tab === 'partner' && (
          <AuthPartnerHandoffPanel
            onSelectPartnerRole={controller.handlePartnerRoute}
            onSwitchToLogin={() => controller.switchTab('login')}
            onPreviewDemo={e => controller.handleSelectTenantTarget('/demo', e)}
          />
        )}

        {!showTenantPicker && !recoveryView && (ui.tab === 'login' || (ui.tab === 'signup' && ui.onboardingStep === 'identity')) && (
          <AuthStepIdentityPanel
            mode={ui.tab === 'signup' ? 'signup' : 'login'}
            email={form.fields.email}
            password={form.fields.password}
            showPassword={ui.showPassword}
            submitting={ui.submitting}
            errorMsg={ui.errorMsg}
            captchaResetKey={ui.captchaResetKey}
            onEmailChange={v => form.setField('email', v)}
            onPasswordChange={v => form.setField('password', v)}
            onTogglePassword={controller.toggleShowPassword}
            onLoginSubmit={controller.handleLoginSubmit}
            onMagicLinkSubmit={controller.handleMagicLinkSubmit}
            onGoogleSignIn={() => void controller.handleGoogleSignIn()}
            onAdvanceSignupStep={controller.handleAdvanceSignupStep}
            onGoToForgotPassword={() => controller.switchTab('forgot_password')}
            onGoToExpiredLink={() => controller.switchTab('expired_link')}
            onNavigatePartner={controller.handlePartnerRoute}
            onCaptchaTokenChange={t => form.setField('captchaToken', t)}
          />
        )}

        {!showTenantPicker && !recoveryView && ui.tab === 'signup' && ui.onboardingStep === 'profile' && (
          <AuthStepProfilePanel
            email={form.fields.email}
            role={form.fields.role}
            fullName={form.fields.fullName}
            city={form.fields.city}
            phone={form.fields.phone}
            ageBand={form.fields.ageBand}
            guardianEmail={form.fields.guardianEmail}
            guardianConsentAccepted={form.fields.guardianConsentAccepted}
            submitting={ui.submitting}
            captchaResetKey={ui.captchaResetKey}
            onRoleChange={r => form.setField('role', r)}
            onFullNameChange={v => form.setField('fullName', v)}
            onCityChange={v => form.setField('city', v)}
            onPhoneChange={v => form.setField('phone', v)}
            onAgeBandChange={b => form.setField('ageBand', b)}
            onGuardianEmailChange={v => form.setField('guardianEmail', v)}
            onGuardianConsentChange={checked => form.setField('guardianConsentAccepted', checked)}
            onBackStep={() => controller.setOnboardingStep('identity')}
            onSubmitSignUp={controller.handleSignUpSubmit}
            onNavigatePartner={controller.handlePartnerRoute}
            onCaptchaTokenChange={t => form.setField('captchaToken', t)}
          />
        )}
      </div>
    </div>
  )
}
