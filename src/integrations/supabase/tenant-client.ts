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
  created_at: string
  updated_at: string
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
  if (!client) return null

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
    return { success: false, message: 'Supabase client unconfigured' }
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
    return { success: false, message: 'Supabase client unconfigured' }
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
