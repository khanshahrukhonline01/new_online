/**
 * KhelGrid SaaS Platform — Multi-Tenant Supabase Client Adapter
 * 
 * Provides tenant-isolated database access for:
 * - Tenant batch management
 * - Enrolled student roster
 * - Inbound parent enquiries (CRM)
 * - Authoritative fee invoices & immutable transactions
 * - Daily pitch-side roll-call events
 * 
 * Enforces PostgreSQL Row Level Security (RLS) via authenticated user context.
 */

import { getSupabaseClient } from './realtime-client'
import type { OrganizationType } from '../../shared/saas/saasTypes'

export interface DbTenant {
  id: string
  slug: string
  name: string
  tenant_type: OrganizationType
  status: 'active' | 'pending_verification' | 'suspended' | 'archived'
  verification_status?: 'unverified' | 'pending_review' | 'verified' | 'rejected'
  owner_id?: string
  parent_tenant_id?: string | null
  city?: string
  state?: string
  sport?: string
  contact_phone?: string
  contact_email?: string
  upi_vpa?: string
  metadata?: Record<string, unknown>
  deleted_at?: string
  archived_at?: string
  created_at: string
  updated_at: string
}

export type DbTenantMemberRole =
  | 'owner'
  | 'org_admin'
  | 'director'
  | 'admin'
  | 'manager'
  | 'finance_manager'
  | 'content_manager'
  | 'listing_manager'
  | 'verification_coordinator'
  | 'head_coach'
  | 'coach'
  | 'accountant'
  | 'front_desk'
  | 'staff'
  | 'readonly_member'
  | 'parent'

export interface DbTenantMembership {
  id: string
  tenant_id: string
  user_id: string
  role: DbTenantMemberRole
  status: 'active' | 'invited' | 'suspended' | 'revoked'
  invited_email?: string
  invited_by?: string
  deleted_at?: string
  created_at: string
  updated_at: string
  tenant?: DbTenant
}

export interface DbTenantBatch {
  id: string
  tenant_id: string
  batch_name: string
  sport: string
  days: string
  timings: string
  coach_name?: string
  age_group?: string
  monthly_fee: number
  max_capacity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbTenantStudent {
  id: string
  tenant_id: string
  batch_id?: string
  student_name: string
  parent_name: string
  parent_phone: string
  parent_email?: string
  guardian_user_id?: string
  date_of_birth?: string
  gender?: string
  monthly_fee: number
  fee_status: 'paid' | 'due_soon' | 'overdue' | 'exempt'
  next_due_date?: string
  last_payment_date?: string
  is_active: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DbTenantEnquiry {
  id: string
  tenant_id: string
  enquiry_token: string
  parent_name: string
  parent_phone: string
  parent_email?: string
  student_name: string
  student_age?: number
  sport: string
  request_type: 'free_trial' | 'regular_admission' | 'scholarship_assessment'
  status: 'new' | 'contacted' | 'trial_scheduled' | 'enrolled' | 'archived'
  notes?: string
  submitted_at: string
  created_at: string
}

export interface DbTenantFeeTransaction {
  id: string
  tenant_id: string
  invoice_id?: string
  student_id: string
  receipt_number: string
  amount: number
  payment_mode: 'cash' | 'direct_upi' | 'bank_transfer' | 'cheque'
  collected_by_user_id?: string
  collected_by_name: string
  collected_date: string
  billing_month: string
  status: 'settled' | 'cash_in_hand' | 'refunded'
  notes?: string
  created_at: string
}

export interface DbTenantAttendanceEvent {
  id: string
  tenant_id: string
  batch_id: string
  student_id: string
  session_date: string
  check_in_time?: string
  status: 'present' | 'absent' | 'excused'
  marked_by?: string
  marked_at: string
  notes?: string
}

export interface DbPublicTenantDirectoryEntry {
  id: string
  slug: string
  name: string
  tenant_type: OrganizationType
  sport?: string
  city?: string
  state?: string
  status: 'active'
  created_at: string
}

/**
 * Fetch public tenant directory listing (safe allowlisted projection)
 * Does NOT expose owner_id, contact_phone, contact_email, upi_vpa, or private metadata.
 */
export async function getPublicTenantBySlug(slug: string): Promise<DbPublicTenantDirectoryEntry | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('tenant_public_directory')
      .select('id, slug, name, tenant_type, sport, city, state, status, created_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.warn(`[TenantClient] getPublicTenantBySlug error for ${slug}:`, error.message)
      return null
    }
    return data as DbPublicTenantDirectoryEntry | null
  } catch (err) {
    console.warn(`[TenantClient] Failed to fetch public tenant ${slug}:`, err)
    return null
  }
}

/**
 * Fetch tenant profile by slug (for authorized tenant member / owner)
 */
export async function getTenantBySlug(slug: string): Promise<DbTenant | null> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      id: `local-tenant-${slug}`,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      slug,
      tenant_type: 'academy',
      status: 'active',
      city: 'Delhi NCR',
      state: 'Delhi',
      sport: 'Cricket',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  try {
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.warn(`[TenantClient] getTenantBySlug error for ${slug}:`, error.message)
      return null
    }
    return data as DbTenant | null
  } catch (err) {
    console.warn(`[TenantClient] Failed to fetch tenant ${slug}:`, err)
    return null
  }
}

/**
 * Fetch coaching batches for an authorized tenant
 */
export async function getTenantBatches(tenantId: string): Promise<DbTenantBatch[]> {
  const client = getSupabaseClient()
  if (!client) return []

  try {
    const { data, error } = await client
      .from('tenant_batches')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn(`[TenantClient] getTenantBatches error:`, error.message)
      return []
    }
    return (data || []) as DbTenantBatch[]
  } catch (err) {
    console.warn('[TenantClient] Failed to fetch tenant batches:', err)
    return []
  }
}

/**
 * Fetch enrolled students for an authorized tenant
 */
export async function getTenantStudents(tenantId: string): Promise<DbTenantStudent[]> {
  const client = getSupabaseClient()
  if (!client) return []

  try {
    const { data, error } = await client
      .from('tenant_students')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('student_name', { ascending: true })

    if (error) {
      console.warn(`[TenantClient] getTenantStudents error:`, error.message)
      return []
    }
    return (data || []) as DbTenantStudent[]
  } catch (err) {
    console.warn('[TenantClient] Failed to fetch tenant students:', err)
    return []
  }
}

/**
 * Save daily attendance events with atomic upsert
 */
export async function saveTenantDailyAttendance(
  tenantId: string,
  batchId: string,
  sessionDate: string,
  attendees: Array<{ studentId: string; status: 'present' | 'absent' | 'excused'; checkInTime?: string }>
): Promise<{ success: boolean; message: string; count: number }> {
  const client = getSupabaseClient()
  if (!client) {
    return { success: false, message: 'Supabase client unconfigured', count: 0 }
  }

  try {
    const rows = attendees.map(a => ({
      tenant_id: tenantId,
      batch_id: batchId,
      student_id: a.studentId,
      session_date: sessionDate,
      status: a.status,
      check_in_time: a.checkInTime ? new Date().toISOString() : undefined,
    }))

    const { data, error } = await client
      .from('tenant_attendance_events')
      .upsert(rows, { onConflict: 'tenant_id,batch_id,student_id,session_date' })
      .select()

    if (error) {
      return { success: false, message: error.message, count: 0 }
    }

    return {
      success: true,
      message: `Successfully saved ${data?.length || rows.length} attendance events`,
      count: data?.length || rows.length,
    }
  } catch (err) {
    return { success: false, message: (err as Error).message, count: 0 }
  }
}

/**
 * Fetch daily attendance roll-call for a given batch and date
 */
export async function getTenantAttendanceForDate(
  tenantId: string,
  batchId: string,
  sessionDate: string
): Promise<DbTenantAttendanceEvent[]> {
  const client = getSupabaseClient()
  if (!client) return []

  try {
    const { data, error } = await client
      .from('tenant_attendance_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('batch_id', batchId)
      .eq('session_date', sessionDate)

    if (error) {
      console.warn('[TenantClient] getTenantAttendanceForDate error:', error.message)
      return []
    }
    return (data || []) as DbTenantAttendanceEvent[]
  } catch (err) {
    console.warn('[TenantClient] Failed to fetch attendance:', err)
    return []
  }
}

/**
 * Fetch financial transactions / receipts for an authorized tenant
 */
export async function getTenantFeeTransactions(tenantId: string): Promise<DbTenantFeeTransaction[]> {
  const client = getSupabaseClient()
  if (!client) return []

  try {
    const { data, error } = await client
      .from('tenant_fee_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('collected_date', { ascending: false })

    if (error) {
      console.warn('[TenantClient] getTenantFeeTransactions error:', error.message)
      return []
    }
    return (data || []) as DbTenantFeeTransaction[]
  } catch (err) {
    console.warn('[TenantClient] Failed to fetch fee transactions:', err)
    return []
  }
}

/**
 * Provision a new tenant and assign the current authenticated user as initial owner
 * Uses the atomic SECURITY DEFINER RPC to bypass circular membership authorization.
 */
export async function provisionInitialTenantOwner(params: {
  slug: string
  name: string
  tenantType: OrganizationType
  city?: string
  state?: string
  sport?: string
  contactPhone?: string
  contactEmail?: string
  metadata?: Record<string, unknown>
}): Promise<{ success: boolean; tenantId?: string; message: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      tenantId: `tenant-${params.slug}`,
      message: 'Successfully provisioned tenant and initial owner membership (local)',
    }
  }

  try {
    const { data, error } = await client.rpc('provision_initial_tenant_owner', {
      p_slug: params.slug,
      p_name: params.name,
      p_tenant_type: params.tenantType,
      p_city: params.city || null,
      p_state: params.state || null,
      p_sport: params.sport || null,
      p_contact_phone: params.contactPhone || null,
      p_contact_email: params.contactEmail || null,
      p_metadata: params.metadata || {},
    })

    if (error) {
      return { success: false, message: error.message }
    }

    return {
      success: true,
      tenantId: data as string,
      message: 'Successfully provisioned tenant and initial owner membership',
    }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Public parent enquiry submission (CRM Lead)
 * Works for unauthenticated parents via is_active_tenant() SECURITY DEFINER helper.
 */
export async function submitTenantEnquiry(enquiry: {
  tenantId: string
  enquiryToken?: string
  parentName: string
  parentPhone: string
  parentEmail?: string
  studentName: string
  studentAge?: number
  sport: string
  requestType: 'free_trial' | 'regular_admission' | 'scholarship_assessment'
  notes?: string
}): Promise<{ success: boolean; enquiryId?: string; enquiryToken?: string; message: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      enquiryId: `local-enq-${Date.now()}`,
      enquiryToken: enquiry.enquiryToken || `ENQ-LOCAL-${Date.now()}`,
      message: 'Locally recorded parent enquiry (offline)',
    }
  }

  const token = enquiry.enquiryToken || `ENQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

  try {
    const { data, error } = await client
      .from('tenant_enquiries')
      .insert({
        tenant_id: enquiry.tenantId,
        enquiry_token: token,
        parent_name: enquiry.parentName,
        parent_phone: enquiry.parentPhone,
        parent_email: enquiry.parentEmail || null,
        student_name: enquiry.studentName,
        student_age: enquiry.studentAge || null,
        sport: enquiry.sport,
        request_type: enquiry.requestType,
        notes: enquiry.notes || null,
        status: 'new',
      })
      .select('id, enquiry_token')
      .single()

    if (error) {
      return { success: false, message: error.message }
    }

    return {
      success: true,
      enquiryId: data.id,
      enquiryToken: data.enquiry_token,
      message: 'Enquiry submitted successfully',
    }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Create a new coaching batch for an authorized tenant
 */
export async function createTenantBatch(
  batch: Omit<DbTenantBatch, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; batch?: DbTenantBatch; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client
      .from('tenant_batches')
      .insert(batch)
      .select()
      .single()

    if (error) return { success: false, message: error.message }
    return { success: true, batch: data as DbTenantBatch, message: 'Batch created successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Register a new student trainee for an authorized tenant
 * Enforces composite key check (student.tenant_id must match batch.tenant_id)
 */
export async function createTenantStudent(
  student: Omit<DbTenantStudent, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; student?: DbTenantStudent; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client
      .from('tenant_students')
      .insert(student)
      .select()
      .single()

    if (error) return { success: false, message: error.message }
    return { success: true, student: data as DbTenantStudent, message: 'Student registered successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Fetch all active tenant memberships for the authenticated user
 */
export async function getUserTenantMemberships(userId: string): Promise<DbTenantMembership[]> {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase is not configured. Tenant access cannot be verified.')
  }
  if (!userId) {
    throw new Error('An authenticated user ID is required to resolve tenant memberships.')
  }

  const { data, error } = await client
    .from('tenant_memberships')
    .select('*, tenant:tenants(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[TenantClient] getUserTenantMemberships failed:', error.message)
    throw new Error('Could not verify workspace memberships. Please retry.')
  }

  return ((data || []) as DbTenantMembership[]).filter(
    membership => membership.user_id === userId &&
      membership.status === 'active' &&
      membership.tenant?.status === 'active'
  )
}

/**
 * Best-effort tenant membership lookup used post-login to route users to their active dashboard.
 * Never throws when Supabase is unconfigured or user has zero tenant memberships.
 */
export async function tryFetchUserTenantMemberships(userId: string): Promise<DbTenantMembership[]> {
  if (!userId) return []
  try {
    return await getUserTenantMemberships(userId)
  } catch {
    return []
  }
}

/**
 * Fetch pending tenant invitations linked to the authenticated user.
 * Fails cleanly to [] when Supabase is unconfigured or offline.
 */
export async function getPendingTenantMemberships(userId: string): Promise<DbTenantMembership[]> {
  const client = getSupabaseClient()
  if (!client || !userId) return []

  try {
    const { data, error } = await client
      .from('tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', userId)
      .eq('status', 'invited')
      .order('created_at', { ascending: false })

    if (error) return []
    return ((data || []) as DbTenantMembership[]).filter(
      membership =>
        membership.user_id === userId &&
        membership.status === 'invited' &&
        membership.tenant?.status === 'active'
    )
  } catch {
    return []
  }
}

export type ResolvedTenantPersona = 'academy' | 'coach' | 'turf' | 'tournament' | 'organization' | 'parent'

/** Maps any of the 18 PostgreSQL tenant_type categories + member role to a WorkspaceShell persona. */
export function mapTenantTypeToPersona(
  tenantType?: string | null,
  memberRole?: string | null
): ResolvedTenantPersona {
  if (memberRole === 'parent') return 'parent'
  switch (tenantType) {
    case 'academy':
      return memberRole === 'coach' || memberRole === 'head_coach' ? 'coach' : 'academy'
    case 'coach':
      return 'coach'
    case 'venue':
      return 'turf'
    case 'tournament':
    case 'event_organizer':
      return 'tournament'
    default:
      return 'organization'
  }
}

/** Builds the canonical dashboard URL for a verified tenant membership. */
export function resolveTenantWorkspacePath(membership: DbTenantMembership): string {
  const persona = mapTenantTypeToPersona(membership.tenant?.tenant_type, membership.role)
  const slug = membership.tenant?.slug
  const basePath =
    persona === 'academy'
      ? '/workspace/academy/overview'
      : persona === 'coach'
        ? '/workspace/coach/overview'
        : persona === 'turf'
          ? '/workspace/turf/calendar'
          : persona === 'tournament'
            ? '/workspace/tournament/overview'
            : persona === 'parent'
              ? '/workspace/parent/attendance'
              : '/workspace/organization/overview'

  return slug ? `${basePath}?tenant=${encodeURIComponent(slug)}` : basePath
}
/**
 * Update tenant profile settings (Restricted to owner & director)
 */
export async function updateTenantSettings(
  tenantId: string,
  updates: Partial<Pick<DbTenant, 'name' | 'city' | 'state' | 'sport' | 'contact_phone' | 'contact_email' | 'upi_vpa' | 'metadata'>>
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { error } = await client
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Tenant settings updated successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Archive a student trainee (Soft-delete via RPC)
 */
export async function softDeleteTenantStudent(
  tenantId: string,
  studentId: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client.rpc('soft_delete_tenant_student', {
      p_tenant_id: tenantId,
      p_student_id: studentId,
    })

    if (error) return { success: false, message: error.message }
    return { success: Boolean(data), message: data ? 'Student archived successfully' : 'Student not found' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Archive a coaching batch (Safely verifies zero active trainees via RPC)
 */
export async function softDeleteTenantBatch(
  tenantId: string,
  batchId: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client.rpc('soft_delete_tenant_batch', {
      p_tenant_id: tenantId,
      p_batch_id: batchId,
    })

    if (error) return { success: false, message: error.message }
    return { success: Boolean(data), message: data ? 'Batch archived successfully' : 'Batch not found' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Convert an enquiry CRM lead to an enrolled student trainee via RPC
 */
export async function convertEnquiryToStudent(params: {
  tenantId: string
  enquiryId: string
  batchId: string
  monthlyFee: number
}): Promise<{ success: boolean; studentId?: string; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client.rpc('convert_enquiry_to_student', {
      p_tenant_id: params.tenantId,
      p_enquiry_id: params.enquiryId,
      p_batch_id: params.batchId,
      p_monthly_fee: params.monthlyFee,
    })

    if (error) return { success: false, message: error.message }
    return { success: true, studentId: data as string, message: 'Lead converted to enrolled student successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Invite coaching staff or administrator via email
 */
export async function createTenantInvitation(params: {
  tenantId: string
  invitedEmail: string
  role: 'director' | 'admin' | 'head_coach' | 'coach' | 'accountant' | 'front_desk' | 'staff'
}): Promise<{ success: boolean; membershipId?: string; message: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      membershipId: `invite-${Date.now()}`,
      message: 'Invitation issued successfully (local)',
    }
  }

  try {
    const { data, error } = await client.rpc('create_tenant_invitation', {
      p_tenant_id: params.tenantId,
      p_invited_email: params.invitedEmail,
      p_role: params.role,
    })

    if (error) return { success: false, message: error.message }
    return { success: true, membershipId: data as string, message: 'Invitation issued successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Accept staff invitation for the current authenticated user
 */
export async function acceptTenantInvitation(
  membershipId: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      message: 'Invitation accepted successfully (local)',
    }
  }

  try {
    const { data, error } = await client.rpc('accept_tenant_invitation', {
      p_membership_id: membershipId,
    })

    if (error) return { success: false, message: error.message }
    return { success: Boolean(data), message: 'Invitation accepted successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Record a fee transaction receipt for an authorized tenant
 */
export async function recordTenantFeeTransaction(
  tx: Omit<DbTenantFeeTransaction, 'id' | 'created_at'>
): Promise<{ success: boolean; transaction?: DbTenantFeeTransaction; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client
      .from('tenant_fee_transactions')
      .insert(tx)
      .select()
      .single()

    if (error) return { success: false, message: error.message }
    return { success: true, transaction: data as DbTenantFeeTransaction, message: 'Fee transaction recorded successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

export interface DbTenantAuditLog {
  id: string
  tenant_id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown>
  created_at: string
}

/**
 * Record an audit log event via append-only RPC
 */
export async function recordTenantAuditLog(params: {
  tenantId: string
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}): Promise<{ success: boolean; logId?: string; message: string }> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Supabase client unconfigured' }

  try {
    const { data, error } = await client.rpc('log_tenant_audit_event', {
      p_tenant_id: params.tenantId,
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId || null,
      p_details: params.details || {},
    })

    if (error) return { success: false, message: error.message }
    return { success: true, logId: data as string, message: 'Audit event logged successfully' }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}

/**
 * Fetch immutable audit logs for an authorized tenant (owner, director, admin)
 */
export async function getTenantAuditLogs(
  tenantId: string,
  limit = 50
): Promise<DbTenantAuditLog[]> {
  const client = getSupabaseClient()
  if (!client) return []

  try {
    const { data, error } = await client
      .from('tenant_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[TenantClient] getTenantAuditLogs error:', error.message)
      return []
    }
    return (data || []) as DbTenantAuditLog[]
  } catch (err) {
    console.warn('[TenantClient] Failed to fetch audit logs:', err)
    return []
  }
}


