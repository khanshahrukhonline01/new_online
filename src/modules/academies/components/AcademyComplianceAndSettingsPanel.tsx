import { useEffect, useId, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { useFormState } from '../../../shared/hooks/useFormState'
import {
  generateAcademyDisasterBackup,
  isValidUpiVpa,
  validateAndRestoreAcademyBackup,
  type AcademyUserRole,
} from '../../../shared/saas/saasLaunchReadinessService'
import {
  getTenantAuditLogs,
  recordTenantAuditLog,
  updateTenantSettings,
  type DbTenant,
  type DbTenantAuditLog,
} from '../../../integrations/supabase/tenant-client'
import { downloadBlobFile } from '../academyExportUtils'
import { SaaSSubscriptionCard } from '../SaaSSubscriptionCard'
import type {
  EquipmentAssetItem,
  KitDistributionItem,
  SafetyIncidentRecord,
  StaffSafeguardingRecord,
} from '../academyInventoryService'
import {
  deleteAcademyStaffMember,
  saveAcademySettings,
  type AcademyBatch,
  type AcademyFeeTransaction,
  type AcademyLead,
  type AcademySettings,
  type AcademyStaffMember,
  type AcademyStudent,
  type AcademyTrialPass,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyComplianceAndSettingsPanelProps {
  activeTab: 'staff' | 'kits' | 'safeguarding' | 'settings' | 'audit_logs'
  selectedSlug: string
  currentTenant: DbTenant | null
  currentAcademy: RegisteredAcademy
  verifiedRole: string | null | undefined
  userRole: AcademyUserRole
  bilingualMode: boolean
  batches: AcademyBatch[]
  students: AcademyStudent[]
  leads: AcademyLead[]
  passes: AcademyTrialPass[]
  staff: AcademyStaffMember[]
  feeTransactions: AcademyFeeTransaction[]
  settings: AcademySettings
  kits: KitDistributionItem[]
  equipment: EquipmentAssetItem[]
  safeguardingStaff: StaffSafeguardingRecord[]
  safetyIncidents: SafetyIncidentRecord[]
  onOpenAddStaff: () => void
  onRefreshTenant: () => Promise<void>
  onRefresh: () => void
}

interface AcademySettingsFormFields extends Record<string, unknown> {
  academyName: string
  city: string
  state: string
  sport: string
  directorName: string
  directorWhatsApp: string
  contactEmail: string
  upiVpa: string
}

/**
 * Renders the Academy Staff, Kit Locker, POCSO Safeguarding, Audit Logs, and Settings/Backup tabs.
 */
export function AcademyComplianceAndSettingsPanel({
  activeTab,
  selectedSlug,
  currentTenant,
  currentAcademy,
  verifiedRole,
  userRole,
  bilingualMode,
  batches,
  students,
  leads,
  passes,
  staff,
  feeTransactions,
  settings,
  kits,
  equipment,
  safeguardingStaff,
  safetyIncidents,
  onOpenAddStaff,
  onRefreshTenant,
  onRefresh,
}: AcademyComplianceAndSettingsPanelProps) {
  const [auditLogs, setAuditLogs] = useState<DbTenantAuditLog[]>([])
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false)
  const [backupRestoreMsg, setBackupRestoreMsg] = useState('')
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsSubmitting, setSettingsSubmitting] = useState(false)

  const settingsAcademyNameId = useId()
  const settingsSportId = useId()
  const settingsCityId = useId()
  const settingsStateId = useId()
  const settingsContactEmailId = useId()
  const settingsDirectorNameId = useId()
  const settingsDirectorWhatsAppId = useId()
  const settingsUpiVpaId = useId()

  const isMatchedTenant = Boolean(
    currentTenant && (currentTenant.slug === selectedSlug || currentTenant.id === currentAcademy.id)
  )

  const authoritativeDirectorName = (currentTenant?.metadata?.director_name as string) || settings.directorName || ''
  const authoritativeDirectorWhatsApp = currentTenant?.contact_phone || settings.directorWhatsApp || ''
  const authoritativeUpiVpa = currentTenant?.upi_vpa || settings.upiVpa || ''
  const authoritativeEmail = currentTenant?.contact_email || ''

  const settingsForm = useFormState<AcademySettingsFormFields>({
    academyName: isMatchedTenant ? (currentTenant?.name || '') : currentAcademy.name,
    city: isMatchedTenant ? (currentTenant?.city || '') : (currentAcademy.city || ''),
    state: isMatchedTenant ? (currentTenant?.state || '') : (currentAcademy.state || ''),
    sport: isMatchedTenant ? (currentTenant?.sport || 'Multi-Sport') : (currentAcademy.sport || 'Multi-Sport'),
    directorName: authoritativeDirectorName,
    directorWhatsApp: authoritativeDirectorWhatsApp,
    contactEmail: isMatchedTenant ? authoritativeEmail : '',
    upiVpa: authoritativeUpiVpa,
  })

  useEffect(() => {
    settingsForm.reset({
      academyName: isMatchedTenant ? (currentTenant?.name || '') : currentAcademy.name,
      city: isMatchedTenant ? (currentTenant?.city || '') : (currentAcademy.city || ''),
      state: isMatchedTenant ? (currentTenant?.state || '') : (currentAcademy.state || ''),
      sport: isMatchedTenant ? (currentTenant?.sport || 'Multi-Sport') : (currentAcademy.sport || 'Multi-Sport'),
      directorName: (currentTenant?.metadata?.director_name as string) || settings.directorName || '',
      directorWhatsApp: currentTenant?.contact_phone || settings.directorWhatsApp || '',
      contactEmail: isMatchedTenant ? (currentTenant?.contact_email || '') : '',
      upiVpa: currentTenant?.upi_vpa || settings.upiVpa || '',
    })
    setSettingsError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMatchedTenant,
    currentTenant,
    selectedSlug,
    currentAcademy.id,
    currentAcademy.name,
    currentAcademy.city,
    currentAcademy.state,
    currentAcademy.sport,
    settings.directorName,
    settings.directorWhatsApp,
    settings.upiVpa,
  ])

  useEffect(() => {
    if (activeTab === 'audit_logs' && currentTenant?.id) {
      setIsLoadingAuditLogs(true)
      getTenantAuditLogs(currentTenant.id)
        .then(logs => setAuditLogs(logs))
        .catch(err => console.warn('[AcademyHub] Failed to fetch audit logs:', err))
        .finally(() => setIsLoadingAuditLogs(false))
    }
  }, [activeTab, currentTenant?.id])

  const isAuthorizedToEdit = currentTenant
    ? (verifiedRole === 'owner' || verifiedRole === 'director' || verifiedRole === 'admin')
    : true

  const handleSaveSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSettingsError('')

    const f = settingsForm.fields
    const trimmedVpa = f.upiVpa.trim()
    if (trimmedVpa && !isValidUpiVpa(trimmedVpa)) {
      setSettingsError('Invalid UPI ID (VPA) format. Must be formatted like name@bankhandle (e.g. bengaluruacademy@oksbi, team@icici).')
      return
    }

    if (currentTenant && !isAuthorizedToEdit) {
      setSettingsError(`Access restricted: Users with role "${verifiedRole || userRole}" are not authorized to modify tenant settings. Only Owners and Directors have permission.`)
      return
    }

    setSettingsSubmitting(true)

    try {
      if (currentTenant?.id) {
        const res = await updateTenantSettings(currentTenant.id, {
          name: f.academyName.trim() || currentAcademy.name,
          city: f.city.trim() || undefined,
          state: f.state.trim() || undefined,
          sport: f.sport.trim() || undefined,
          contact_phone: f.directorWhatsApp.trim() || undefined,
          contact_email: f.contactEmail.trim() || undefined,
          upi_vpa: trimmedVpa || undefined,
          metadata: {
            ...(currentTenant.metadata || {}),
            director_name: f.directorName.trim(),
            updated_by_role: verifiedRole || userRole,
            last_settings_update: new Date().toISOString(),
          },
        })

        if (!res.success) {
          setSettingsError(res.message || 'Failed to update tenant settings in database.')
          setSettingsSubmitting(false)
          return
        }

        await recordTenantAuditLog({
          tenantId: currentTenant.id,
          action: 'update_tenant_settings',
          entityType: 'tenants',
          entityId: currentTenant.id,
          details: {
            name: f.academyName.trim(),
            city: f.city.trim(),
            state: f.state.trim(),
            sport: f.sport.trim(),
            contactPhone: f.directorWhatsApp.trim(),
            contactEmail: f.contactEmail.trim(),
            upiVpa: trimmedVpa,
            directorName: f.directorName.trim(),
            updatedByRole: verifiedRole || userRole,
          },
        }).catch(err => console.warn('[AcademyHub] Remote audit log error:', err))

        await onRefreshTenant()
      }

      saveAcademySettings({
        academySlug: selectedSlug,
        academyName: f.academyName.trim() || currentAcademy.name,
        directorName: f.directorName.trim(),
        directorWhatsApp: f.directorWhatsApp.trim(),
        upiVpa: trimmedVpa,
        autoWhatsAppRoutingEnabled: true,
        isProUnlocked: true,
      })

      setSettingsSavedNotice(true)
      setTimeout(() => setSettingsSavedNotice(false), 3500)
      onRefresh()
    } catch (err) {
      setSettingsError((err as Error).message || 'An unexpected error occurred while saving operations settings.')
    } finally {
      setSettingsSubmitting(false)
    }
  }

  const handleDownloadBackup = () => {
    const backup = generateAcademyDisasterBackup(selectedSlug, currentAcademy.name, {
      settings,
      batches,
      students,
      leads,
      staff,
      transactions: feeTransactions,
      passes,
      kits,
      safeguarding: safeguardingStaff,
    })
    downloadBlobFile(
      `${selectedSlug}-disaster-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8;'
    )
  }

  const handleRestoreBackupFile = (fileContent: string) => {
    const res = validateAndRestoreAcademyBackup(fileContent, selectedSlug)
    setBackupRestoreMsg(res.message)
    if (res.success) {
      onRefresh()
    }
  }

  if (activeTab === 'staff') {
    return (
      <section aria-labelledby="staff-section-heading">
        <div className="academy-hub-section-header">
          <div>
            <h2 id="staff-section-heading" className="academy-hub-section-title">
              Coaching Staff &amp; Operational Roles
            </h2>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              Manage head coaches, assistant trainers, accountants, and ground staff with role-based dashboard permissions.
            </p>
          </div>

          <button
            type="button"
            className="academy-hub-primary-btn"
            onClick={onOpenAddStaff}
          >
            <SiteIcon name="plus" size={16} /> Add Staff Member
          </button>
        </div>

        <div className="academy-staff-grid">
          {staff.map(member => (
            <div className="academy-staff-card" key={member.id}>
              <div className="academy-staff-header">
                <div>
                  <h3 className="academy-staff-name">{member.name}</h3>
                  {member.qualification && (
                    <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 650 }}>
                      {member.qualification}
                    </span>
                  )}
                </div>
                <span className={`staff-role-badge ${member.role}`}>
                  {member.role.replace('_', ' ')}
                </span>
              </div>

              <div className="academy-staff-details">
                <div><SiteIcon name="phone" size={14} /> +91 {member.phone}</div>
                {member.email && <div><SiteIcon name="mail" size={14} /> {member.email}</div>}
                <div style={{ marginTop: '0.25rem' }}>
                  <strong>Assigned Batches:</strong>{' '}
                  {member.assignedBatches?.length
                    ? member.assignedBatches.map(bId => batches.find(b => b.id === bId)?.batchName || bId).join(', ')
                    : 'All Batches'}
                </div>
              </div>

              <div className="academy-staff-footer">
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Joined: {member.joinedDate}</span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => {
                    deleteAcademyStaffMember(member.id)
                    onRefresh()
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (activeTab === 'kits') {
    return (
      <section aria-labelledby="kits-section-heading">
        <div className="academy-hub-section-header">
          <div>
            <h2 id="kits-section-heading" className="academy-hub-section-title">
              Academy Kit Locker &amp; Equipment Inventory
            </h2>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              Track student jersey sizes, assigned squad numbers, and training gear checkout logs.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="academy-hub-card-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#0f172a' }}>Student Match Kits &amp; Squad Numbers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {kits.map(k => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div>
                    <strong>#{k.squadNumber} {k.studentName}</strong> ({k.batchName})
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      Jersey Size: <strong>{k.jerseySize}</strong> · Shorts: {k.hasShorts ? 'Yes' : 'No'} · Socks: {k.hasSocks ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: k.status === 'DELIVERED' ? '#dcfce7' : '#fef3c7', color: k.status === 'DELIVERED' ? '#166534' : '#b45309' }}>
                    {k.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="academy-hub-card-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#0f172a' }}>Training Equipment &amp; Gear Checkout</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {equipment.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div>
                    <strong>{e.name}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      Category: {e.category} · Condition: {e.condition} · Checked out: {e.checkedOutQuantity} units to {e.lastCheckedOutBy || 'None'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{e.availableQuantity} / {e.totalQuantity}</strong>
                    <small style={{ display: 'block', color: '#64748b', fontSize: '0.75rem' }}>in locker</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (activeTab === 'safeguarding') {
    return (
      <section aria-labelledby="safeguarding-section-heading">
        <div className="academy-hub-section-header">
          <div>
            <h2 id="safeguarding-section-heading" className="academy-hub-section-title">
              POCSO Child Protection &amp; Medical Safeguarding Register
            </h2>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              Staff police background verification, first aid certification, and student ground injury logs.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="academy-hub-card-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#0f172a' }}>Staff Background Check &amp; POCSO Compliance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {safeguardingStaff.map(s => (
                <div key={s.id} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong>{s.staffName}</strong> ({s.role})
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: s.policeVerificationStatus === 'VERIFIED' ? '#dcfce7' : '#fef3c7', color: s.policeVerificationStatus === 'VERIFIED' ? '#166534' : '#b45309' }}>
                      {s.policeVerificationStatus}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    Police Ref: <code>{s.policeVerificationRef || 'Pending'}</code> · Verified: {s.verificationDate || 'In Progress'}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.78rem' }}>
                    <span style={{ color: s.pocsoTrainingCompleted ? '#16a34a' : '#dc2626' }}>
                      {s.pocsoTrainingCompleted ? '✅ POCSO Certified' : '❌ POCSO Pending'}
                    </span>
                    <span style={{ color: s.firstAidCertified ? '#16a34a' : '#dc2626' }}>
                      {s.firstAidCertified ? '✅ First Aid Certified' : '❌ First Aid Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="academy-hub-card-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#0f172a' }}>Ground Medical &amp; Incident Logbook</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {safetyIncidents.map(inc => (
                <div key={inc.id} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong>{inc.studentName}</strong> ({inc.incidentDate})
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: inc.rtpClearance === 'CLEARED' ? '#dcfce7' : '#fee2e2', color: inc.rtpClearance === 'CLEARED' ? '#166534' : '#991b1b' }}>
                      RTP: {inc.rtpClearance}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', color: '#334155', fontSize: '0.82rem' }}>{inc.description}</p>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    First Aid: {inc.firstAidAdministered} · Parent Notified: {inc.parentNotifiedAt || 'Yes'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (activeTab === 'audit_logs') {
    return (
      <section aria-labelledby="audit-logs-section-heading" data-testid="saas-audit-logs-section">
        <div className="academy-hub-section-header">
          <div>
            <h2 id="audit-logs-section-heading" className="academy-hub-section-title">
              {bilingualMode ? 'अपरिवर्तनीय टेनेंट ऑडिट लॉग (Security & Audit Trail)' : 'Tenant Security & Immutable Audit Log'}
            </h2>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              {bilingualMode
                ? 'सभी प्रशासनिक, वित्तीय और छात्र सूची परिवर्तनों का टाइमस्टैम्प-युक्त सुरक्षित रिकॉर्ड।'
                : 'Cryptographically-timestamped append-only record of all administrative, financial, and roster modifications.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="academy-hub-btn-outline"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={() => {
                const rows = [
                  ['ID', 'Action', 'Entity Type', 'Entity ID', 'Timestamp'],
                  ...auditLogs.map(l => [l.id, l.action, l.entity_type, l.entity_id || '', l.created_at]),
                ]
                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                downloadBlobFile(`${currentAcademy.slug}-security-audit-log.csv`, csv)
              }}
            >
              <SiteIcon name="download" size={15} /> Export Audit CSV
            </button>
            <button
              type="button"
              className="academy-hub-primary-btn"
              onClick={() => {
                if (currentTenant?.id) {
                  setIsLoadingAuditLogs(true)
                  getTenantAuditLogs(currentTenant.id)
                    .then(logs => setAuditLogs(logs))
                    .finally(() => setIsLoadingAuditLogs(false))
                }
              }}
            >
              <SiteIcon name="arrow-up-right" size={15} /> Refresh Logs
            </button>
          </div>
        </div>

        <div className="academy-hub-table-wrapper">
          <table className="academy-hub-table" role="table" aria-label="Tenant Audit Logs">
            <thead>
              <tr>
                <th scope="col">Timestamp</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Initiated By</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingAuditLogs ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading secure tenant audit records...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No audit log records found for this workspace. Standard operational actions (attendance, fees, roster changes) are automatically appended here.
                  </td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                    </td>
                    <td>
                      <span className="lead-status-pill enrolled">{log.entity_type}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {log.actor_user_id ? `${log.actor_user_id.slice(0, 8)}...` : 'System / Direct'}
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="settings-section-heading" style={{ maxWidth: '750px' }}>
      <SaaSSubscriptionCard academyName={currentAcademy.name} />

      <h2 id="settings-section-heading" className="academy-hub-section-title">
        Director WhatsApp &amp; UPI Routing Setup
      </h2>
      <p style={{ color: '#64748b', margin: '0.35rem 0 1.5rem' }}>
        Configure your official WhatsApp mobile number so new parent enquiries are instantly transmitted to your phone.
      </p>

      {!isAuthorizedToEdit && (
        <div
          className="state-panel state-warning"
          role="alert"
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            borderLeft: '4px solid #f59e0b',
            background: '#fffbeb',
            color: '#92400e',
            borderRadius: '6px',
          }}
        >
          <strong>Read-Only Workspace Access:</strong> You are currently authenticated as{' '}
          <strong>{verifiedRole || userRole}</strong>. Only Academy Owners and Directors are authorized to
          modify public directory metadata, contact numbers, and bank UPI settlement VPAs.
        </div>
      )}

      {settingsError && (
        <div
          className="state-panel state-error"
          role="alert"
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <SiteIcon name="alert-triangle" size={16} />
          <span>{settingsError}</span>
        </div>
      )}

      {settingsSavedNotice && (
        <p
          className="state-panel state-available"
          role="status"
          style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem' }}
        >
          Settings saved successfully! Lead routing, public directory metadata, and fee UPI are now active in PostgreSQL.
        </p>
      )}

      <form onSubmit={handleSaveSettingsSubmit} className="academy-hub-form">
        <label htmlFor={settingsAcademyNameId}>
          Academy Legal / Operating Name
          <input
            id={settingsAcademyNameId}
            required
            disabled={!isAuthorizedToEdit}
            value={settingsForm.fields.academyName}
            onChange={e => settingsForm.setField('academyName', e.target.value)}
            placeholder="e.g. Bengaluru FC Residential Academy"
          />
          <small style={{ color: '#64748b', fontWeight: 'normal' }}>
            Synchronized automatically to the public discovery directory.
          </small>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label htmlFor={settingsSportId}>
            Primary Sport
            <input
              id={settingsSportId}
              required
              disabled={!isAuthorizedToEdit}
              value={settingsForm.fields.sport}
              onChange={e => settingsForm.setField('sport', e.target.value)}
              placeholder="e.g. Football"
            />
          </label>

          <label htmlFor={settingsCityId}>
            City / District
            <input
              id={settingsCityId}
              required
              disabled={!isAuthorizedToEdit}
              value={settingsForm.fields.city}
              onChange={e => settingsForm.setField('city', e.target.value)}
              placeholder="e.g. Bengaluru"
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label htmlFor={settingsStateId}>
            State / UT
            <input
              id={settingsStateId}
              disabled={!isAuthorizedToEdit}
              value={settingsForm.fields.state}
              onChange={e => settingsForm.setField('state', e.target.value)}
              placeholder="e.g. Karnataka"
            />
          </label>

          <label htmlFor={settingsContactEmailId}>
            Official Contact Email
            <input
              id={settingsContactEmailId}
              type="email"
              disabled={!isAuthorizedToEdit}
              value={settingsForm.fields.contactEmail}
              onChange={e => settingsForm.setField('contactEmail', e.target.value)}
              placeholder="e.g. admissions@bengaluruacademy.in"
            />
          </label>
        </div>

        <label htmlFor={settingsDirectorNameId}>
          Director / Head Coach Name
          <input
            id={settingsDirectorNameId}
            required
            disabled={!isAuthorizedToEdit}
            value={settingsForm.fields.directorName}
            onChange={e => settingsForm.setField('directorName', e.target.value)}
            placeholder="e.g. Coach Ramesh Kumar"
          />
        </label>

        <label htmlFor={settingsDirectorWhatsAppId}>
          Official WhatsApp Mobile Number (for Lead Routing)
          <input
            id={settingsDirectorWhatsAppId}
            required
            disabled={!isAuthorizedToEdit}
            value={settingsForm.fields.directorWhatsApp}
            onChange={e => settingsForm.setField('directorWhatsApp', e.target.value)}
            placeholder="e.g. 9845012345"
          />
          <small style={{ color: '#64748b', fontWeight: 'normal' }}>
            When parents click to enquire on your academy page, their lead and requirements route directly to this WhatsApp number.
          </small>
        </label>

        <label htmlFor={settingsUpiVpaId}>
          Academy UPI ID (VPA) for Fee Collection
          <div style={{ position: 'relative' }}>
            <input
              id={settingsUpiVpaId}
              disabled={!isAuthorizedToEdit}
              value={settingsForm.fields.upiVpa}
              onChange={e => {
                settingsForm.setField('upiVpa', e.target.value)
                if (settingsError) setSettingsError('')
              }}
              placeholder="e.g. bengaluruacademy@oksbi"
              style={{
                borderColor: settingsForm.fields.upiVpa.trim()
                  ? (isValidUpiVpa(settingsForm.fields.upiVpa.trim()) ? '#10b981' : '#ef4444')
                  : undefined,
              }}
            />
            {settingsForm.fields.upiVpa.trim() && (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isValidUpiVpa(settingsForm.fields.upiVpa.trim()) ? '#059669' : '#dc2626',
                }}
              >
                {isValidUpiVpa(settingsForm.fields.upiVpa.trim()) ? '✓ Valid UPI VPA' : '✗ Invalid VPA Format'}
              </span>
            )}
          </div>
          <small style={{ color: '#64748b', fontWeight: 'normal' }}>
            Used to generate instant UPI payment links and QR codes. Fees go 100% directly to your bank account.
          </small>
        </label>

        <button
          type="submit"
          className="academy-hub-primary-btn"
          disabled={!isAuthorizedToEdit || settingsSubmitting}
          style={{ marginTop: '0.5rem', opacity: (!isAuthorizedToEdit || settingsSubmitting) ? 0.6 : 1 }}
        >
          {settingsSubmitting ? 'Saving Operations Settings...' : 'Save Operations Settings'}
        </button>
      </form>

      <div
        data-testid="disaster-recovery-panel"
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <SiteIcon name="shield-check" size={20} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
            Disaster Recovery &amp; Offline Data Backup
          </h3>
        </div>
        <p style={{ margin: '0 0 1rem', fontSize: '13px', color: '#64748b' }}>
          Export an encrypted, checksum-verified snapshot of all academy data (students, batches, transactions, staff, kits) or restore from an existing backup with full multi-tenant integrity.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="academy-hub-btn-outline"
            style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#fff' }}
            onClick={handleDownloadBackup}
          >
            <SiteIcon name="download" size={15} /> Export Backup Snapshot (JSON)
          </button>

          <label
            className="academy-hub-btn-outline"
            style={{ padding: '8px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#fff' }}
          >
            <SiteIcon name="upload" size={15} /> Restore From Backup (JSON)
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = ev => {
                    const content = ev.target?.result as string
                    handleRestoreBackupFile(content)
                  }
                  reader.readAsText(file)
                }
              }}
            />
          </label>
        </div>

        {backupRestoreMsg && (
          <p
            role="status"
            style={{
              marginTop: '0.85rem',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              background: backupRestoreMsg.includes('Successfully') ? '#f0fdf4' : '#fef2f2',
              color: backupRestoreMsg.includes('Successfully') ? '#166534' : '#991b1b',
              border: backupRestoreMsg.includes('Successfully') ? '1px solid #bbf7d0' : '1px solid #fecaca',
              fontWeight: 600,
            }}
          >
            {backupRestoreMsg}
          </p>
        )}
      </div>
    </section>
  )
}
