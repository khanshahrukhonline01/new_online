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

export interface DbTenant {
  id: string
  slug: string
  name: string
  tenant_type: 'academy' | 'coach' | 'venue' | 'tournament'
  status: 'active' | 'pending_verification' | 'suspended' | 'archived'
  owner_id?: string
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

/**
 * Fetch tenant profile by slug
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
