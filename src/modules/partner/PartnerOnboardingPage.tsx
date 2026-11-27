import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { AuthCaptchaWidget } from '../../shared/components/auth/AuthCaptchaWidget'
import { useFormState } from '../../shared/hooks/useFormState'
import {
  getStoredAuthUser,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import {
  resolveTenantWorkspacePath,
  tryFetchUserTenantMemberships,
  getPendingTenantMemberships,
  type DbTenantMembership,
} from '../../integrations/supabase/tenant-client'
import type { OrganizationType } from '../../shared/saas/saasTypes'
import {
  acceptTenantInvitation,
  normalizePartnerRole,
  onboardPartnerOrganization,
  ORGANIZATION_SUBTYPE_OPTIONS,
  PARTNER_ROLE_CONFIG,
  PARTNER_ROLES_ORDERED,
  signInPartnerAccount,
  type PartnerRole,
} from './partnerOnboardingService'
import './PartnerOnboardingPage.css'

export interface PartnerOnboardingPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  initialMode?: 'signup' | 'login'
  initialRole?: PartnerRole
  onAuthSuccess?: (user: AuthUserProfile) => void
}

const ROLE_ICON: Record<PartnerRole, 'building' | 'award' | 'calendar' | 'sparkles'> = {
  academy: 'building',
  coach: 'award',
  venue: 'calendar',
  tournament: 'sparkles',
  organization: 'building',
}

interface OnboardingFormFields extends Record<string, unknown> {
  entityName: string
  directorName: string
  organizationType: OrganizationType
  sport: string
  city: string
  phone: string
  email: string
  password: string
  upiVpa: string
  certification: string
  loginEmail: string
  loginPassword: string
}

export default function PartnerOnboardingPage({
  onNavigate,
  initialMode = 'signup',
  initialRole = 'academy',
  onAuthSuccess,
}: PartnerOnboardingPageProps) {
  const existingUser = getStoredAuthUser()
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode)
  const [selectedRole, setSelectedRole] = useState<PartnerRole>(() => normalizePartnerRole(initialRole))
  const [statusMessage, setStatusMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [postLoginWorkspaces, setPostLoginWorkspaces] = useState<{
    memberships: DbTenantMembership[]
    pendingInvitations: DbTenantMembership[]
  } | null>(null)

  const form = useFormState<OnboardingFormFields>({
    entityName: '',
    directorName: existingUser?.fullName || '',
    organizationType: 'club',
    sport: 'Cricket',
    city: existingUser?.city || 'Delhi NCR',
    phone: existingUser?.phone || '',
    email: existingUser?.email || '',
    password: '',
    upiVpa: '',
    certification: '',
    loginEmail: existingUser?.email || '',
    loginPassword: '',
  })

  const roleConfig = PARTNER_ROLE_CONFIG[selectedRole]

  const navigateToWorkspace = (targetRoute: string) => {
    if (onNavigate) {
      const syntheticEvent = { preventDefault: () => {} } as MouseEvent<HTMLAnchorElement>
      onNavigate(syntheticEvent, targetRoute)
    } else if (typeof window !== 'undefined') {
      window.location.href = targetRoute
    }
  }

  const submitOnboarding = async (useMagicLink = false) => {
    setStatusMessage(null)
    form.beginSubmit()
    try {
      const outcome = await onboardPartnerOrganization({
        role: selectedRole,
        organizationType: selectedRole === 'organization' ? form.fields.organizationType : undefined,
        entityName: form.fields.entityName,
        directorName: form.fields.directorName,
        sport: form.fields.sport,
        city: form.fields.city,
        phone: form.fields.phone,
        email: form.fields.email,
        password: form.fields.password,
        upiVpa: form.fields.upiVpa,
        certification: form.fields.certification,
        useMagicLink,
        captchaToken: captchaToken || undefined,
      })

      if (!outcome.success) {
        setCaptchaResetKey(k => k + 1)
        setStatusMessage({ kind: 'error', text: outcome.message })
        return
      }

      if (outcome.user) {
        onAuthSuccess?.(outcome.user)
      }

      setCaptchaResetKey(k => k + 1)
      setStatusMessage({ kind: 'success', text: outcome.message })
      if (!outcome.requiresEmailVerification && outcome.workspacePath) {
        navigateToWorkspace(outcome.workspacePath)
      }
    } catch (err) {
      setCaptchaResetKey(k => k + 1)
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Partner onboarding could not be completed.',
      })
    } finally {
      form.endSubmit()
    }
  }

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submitOnboarding(false)
  }

  const submitLogin = async (useMagicLink = false) => {
    setStatusMessage(null)
    form.beginSubmit()
    try {
      const outcome = await signInPartnerAccount({
        role: selectedRole,
        email: form.fields.loginEmail,
        password: form.fields.loginPassword,
        useMagicLink,
        captchaToken: captchaToken || undefined,
      })

      if (!outcome.success) {
        setCaptchaResetKey(k => k + 1)
        setStatusMessage({ kind: 'error', text: outcome.message })
        return
      }

      if (outcome.user) {
        onAuthSuccess?.(outcome.user)
      }

      setCaptchaResetKey(k => k + 1)
      setStatusMessage({ kind: 'success', text: outcome.message })
      if (!outcome.requiresEmailVerification && outcome.workspacePath) {
        setPostLoginWorkspaces(null)
        navigateToWorkspace(outcome.workspacePath)
      } else if (!outcome.requiresEmailVerification && ((outcome.memberships?.length || 0) > 0 || (outcome.pendingInvitations?.length || 0) > 0)) {
        setPostLoginWorkspaces({
          memberships: outcome.memberships || [],
          pendingInvitations: outcome.pendingInvitations || [],
        })
      }
    } catch (err) {
      setCaptchaResetKey(k => k + 1)
      setStatusMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Sign-in could not be completed.',
      })
    } finally {
      form.endSubmit()
    }
  }

  const handleAcceptPartnerInvite = async (invite: DbTenantMembership) => {
    setStatusMessage(null)
    form.beginSubmit()
    try {
      const res = await acceptTenantInvitation(invite.id)
      if (!res.success) {
        setStatusMessage({ kind: 'error', text: res.message })
        return
      }
      if (existingUser) {
        const [memberships, pendingInvitations] = await Promise.all([
          tryFetchUserTenantMemberships(existingUser.id),
          getPendingTenantMemberships(existingUser.id),
        ])
        setPostLoginWorkspaces({ memberships, pendingInvitations })
      }
      setStatusMessage({ kind: 'success', text: `Joined ${invite.tenant?.name || 'workspace'}! Opening dashboard...` })
      navigateToWorkspace(resolveTenantWorkspacePath(invite))
    } finally {
      form.endSubmit()
    }
  }

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submitLogin(false)
  }

  const handleModeSwitch = (nextMode: 'signup' | 'login') => {
    setMode(nextMode)
    setStatusMessage(null)
    setCaptchaResetKey(k => k + 1)
  }

  return (
    <div className="partner-onboarding-root content-page">
      <header className="partner-onboarding-header">
        <p className="eyebrow partner-onboarding-eyebrow">
          KHELGRID · PARTNER ONBOARDING &amp; SIGN IN
        </p>
        <h1>India&apos;s National Sports Operations Infrastructure</h1>
        <p>
          Empowering sports academies, certified coaches, turf venues, and tournament directors with 0% commission B2B management tools.{' '}
          <a
            href="/demo"
            className="partner-link-btn"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginTop: '8px' }}
            onClick={e => onNavigate?.(e, '/demo')}
          >
            Preview all 8 dashboards before registering →
          </a>
        </p>
      </header>

      <div className="partner-tabs-container" role="tablist" aria-label="Partner onboarding mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`partner-auth-tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('signup')}
        >
          New Partner Onboarding (Free)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`partner-auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('login')}
        >
          Sign In to Workspace
        </button>
      </div>

      <div className="partner-form-card">
        <div className="partner-role-heading-wrap">
          <span className="partner-role-heading">
            Select Your Sports Organisation Category:
          </span>
        </div>

        <div className="partner-role-grid" role="radiogroup" aria-label="Sports organisation category">
          {PARTNER_ROLES_ORDERED.map(roleDef => {
            const isSelected = selectedRole === roleDef.role
            return (
              <button
                key={roleDef.role}
                type="button"
                className={`partner-role-option ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedRole(roleDef.role)}
                role="radio"
                aria-checked={isSelected}
              >
                <div
                  className="role-icon-wrap"
                  style={{ background: roleDef.accentBg, color: roleDef.accentColor }}
                >
                  <SiteIcon name={ROLE_ICON[roleDef.role]} size={20} />
                </div>
                <span className="role-title">{roleDef.label}</span>
                <span className="role-desc">{roleDef.description}</span>
              </button>
            )
          })}
        </div>

        {statusMessage && (
          <div
            role={statusMessage.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`partner-status-banner ${statusMessage.kind === 'error' ? 'is-error' : 'is-success'}`}
          >
            {statusMessage.text}
          </div>
        )}

        {mode === 'signup' ? (
          <form onSubmit={handleRegisterSubmit} className="partner-onboarding-form">
            {existingUser && (
              <div className="partner-session-banner" role="status">
                <SiteIcon name="shield-check" size={18} />
                <span>
                  Authenticated as <strong>{existingUser.email}</strong>. Launching will provision a verified{' '}
                  <strong>{roleConfig.label}</strong> organisation tenant under your account.
                </span>
              </div>
            )}

            <div className="partner-form-row">
              <div className="partner-form-field">
                <label htmlFor="partner-entity-name">{roleConfig.entityLabel}</label>
                <input
                  id="partner-entity-name"
                  type="text"
                  required
                  placeholder={roleConfig.entityPlaceholder}
                  value={form.fields.entityName}
                  onChange={e => form.setField('entityName', e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label htmlFor="partner-sport">Primary Sport</label>
                <select
                  id="partner-sport"
                  value={form.fields.sport}
                  onChange={e => form.setField('sport', e.target.value)}
                >
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Athletics">Athletics / Track &amp; Field</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Multi-Sport">Multi-Sport Facility</option>
                </select>
              </div>
            </div>

            <div className="partner-form-row">
              <div className="partner-form-field">
                <label htmlFor="partner-director-name">{roleConfig.directorLabel}</label>
                <input
                  id="partner-director-name"
                  type="text"
                  required
                  placeholder={roleConfig.directorPlaceholder}
                  value={form.fields.directorName}
                  onChange={e => form.setField('directorName', e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label htmlFor="partner-city">Operating City</label>
                <input
                  id="partner-city"
                  type="text"
                  required
                  placeholder="e.g. Delhi NCR, Bengaluru, Mumbai"
                  value={form.fields.city}
                  onChange={e => form.setField('city', e.target.value)}
                />
              </div>
            </div>

            <div className="partner-form-row">
              <div className="partner-form-field">
                <label htmlFor="partner-phone">Contact Phone (WhatsApp Alerts)</label>
                <input
                  id="partner-phone"
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={form.fields.phone}
                  onChange={e => form.setField('phone', e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label htmlFor="partner-upi">Direct UPI ID (0% Platform Deductions)</label>
                <input
                  id="partner-upi"
                  type="text"
                  placeholder="e.g. academy@okaxis or coach@okhdfcbank"
                  value={form.fields.upiVpa}
                  onChange={e => form.setField('upiVpa', e.target.value)}
                />
              </div>
            </div>

            {selectedRole === 'organization' && (
              <div className="partner-form-field">
                <label htmlFor="partner-org-subtype">Organisation Subtype</label>
                <select
                  id="partner-org-subtype"
                  value={form.fields.organizationType}
                  onChange={e => form.setField('organizationType', e.target.value as OrganizationType)}
                >
                  {ORGANIZATION_SUBTYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedRole === 'coach' && (
              <div className="partner-form-field">
                <label htmlFor="partner-certification">Coaching Certification / Accreditation</label>
                <input
                  id="partner-certification"
                  type="text"
                  placeholder="e.g. BCCI Level 2 · SAI / NIS Patiala Diploma"
                  value={form.fields.certification}
                  onChange={e => form.setField('certification', e.target.value)}
                />
              </div>
            )}

            {!existingUser && (
              <div className="partner-form-row">
                <div className="partner-form-field">
                  <label htmlFor="partner-email">Official Account Email</label>
                  <input
                    id="partner-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@organisation.com"
                    value={form.fields.email}
                    onChange={e => form.setField('email', e.target.value)}
                  />
                </div>

                <div className="partner-form-field">
                  <label htmlFor="partner-password">Account Password (min 6 characters)</label>
                  <input
                    id="partner-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Create secure workspace password"
                    value={form.fields.password}
                    onChange={e => form.setField('password', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="partner-guarantee-banner">
              🛡️ <strong>Zero Platform Commission Guarantee:</strong> All student fees and court booking deposits flow directly into your own UPI VPA bank account with zero platform commission deductions.
            </div>

            {!existingUser && (
              <AuthCaptchaWidget resetKey={captchaResetKey} onTokenChange={setCaptchaToken} />
            )}

            <button
              type="submit"
              disabled={form.submitting}
              className="coach-primary-btn partner-submit-btn"
            >
              <SiteIcon name="sparkles" size={16} />
              <span>
                {form.submitting
                  ? 'Provisioning Verified Workspace...'
                  : 'Launch Your Verified SaaS Workspace (30 Seconds)'}
              </span>
            </button>

            {!existingUser && (
              <div className="partner-secondary-actions">
                <button
                  type="button"
                  disabled={form.submitting}
                  className="partner-link-btn"
                  onClick={() => void submitOnboarding(true)}
                >
                  Use 1-Click Magic Email Link instead of password
                </button>
                <button
                  type="button"
                  className="partner-link-btn"
                  onClick={() => handleModeSwitch('login')}
                >
                  Already have an account? Sign In
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="partner-onboarding-form">
            <div className="partner-form-row">
              <div className="partner-form-field">
                <label htmlFor="partner-login-email">Registered Email Address</label>
                <input
                  id="partner-login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="director@organisation.com"
                  value={form.fields.loginEmail}
                  onChange={e => form.setField('loginEmail', e.target.value)}
                />
              </div>

              <div className="partner-form-field">
                <label htmlFor="partner-login-password">Account Password</label>
                <input
                  id="partner-login-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.fields.loginPassword}
                  onChange={e => form.setField('loginPassword', e.target.value)}
                />
              </div>
            </div>

            <AuthCaptchaWidget resetKey={captchaResetKey} onTokenChange={setCaptchaToken} />

            <button
              type="submit"
              disabled={form.submitting}
              className="coach-primary-btn partner-submit-btn"
            >
              <SiteIcon name="arrow-up-right" size={16} />
              <span>
                {form.submitting
                  ? 'Verifying Credentials...'
                  : `Sign In to ${roleConfig.label} Workspace`}
              </span>
            </button>

            <div className="partner-secondary-actions">
              <button
                type="button"
                disabled={form.submitting}
                className="partner-link-btn"
                onClick={() => void submitLogin(true)}
              >
                Send 1-Click Magic Login Link
              </button>
              <button
                type="button"
                className="partner-link-btn"
                onClick={() => handleModeSwitch('signup')}
              >
                New Partner? Provision Free Workspace
              </button>
            </div>

            {postLoginWorkspaces && (
              <div className="partner-session-banner" role="region" aria-label="Select tenant workspace" style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                {postLoginWorkspaces.memberships.length > 0 && (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <strong>Your Active Tenant Dashboards</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {postLoginWorkspaces.memberships.map(m => {
                        const target = resolveTenantWorkspacePath(m)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            className="coach-primary-btn"
                            onClick={() => navigateToWorkspace(target)}
                          >
                            {m.tenant?.name || 'Workspace'} ({m.role.replace(/_/g, ' ')}) →
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {postLoginWorkspaces.pendingInvitations.length > 0 && (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <strong>Pending Team Invitations</strong>
                    {postLoginWorkspaces.pendingInvitations.map(invite => (
                      <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span>
                          {invite.tenant?.name || 'Workspace'} — invited as <strong>{invite.role.replace(/_/g, ' ')}</strong>
                        </span>
                        <button
                          type="button"
                          className="coach-primary-btn"
                          disabled={form.submitting}
                          onClick={() => void handleAcceptPartnerInvite(invite)}
                        >
                          Accept &amp; Open →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
