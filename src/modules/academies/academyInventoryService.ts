/**
 * KhelGrid Academy Operations: Kit Locker, Equipment & Safeguarding Service
 * 
 * Provides B2B operations tools for sports academies across India:
 * 1. Kit Distribution & Squad Jersey Numbers
 * 2. Equipment & Gear Checkout Ledger (Balls, Cones, Bibs, Hurdles)
 * 3. POCSO & Staff Police Verification Compliance Register
 * 4. Ground Medical & Injury Incident Logbook
 * 
 * Free during Grassroots Launch Phase.
 */

export interface KitDistributionItem {
  id: string
  academySlug: string
  studentId: string
  studentName: string
  batchName: string
  squadNumber: number
  jerseySize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
  hasShorts: boolean
  hasSocks: boolean
  status: 'ALLOCATED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED'
  dispatchedDate?: string
  notes?: string
}

export interface EquipmentAssetItem {
  id: string
  academySlug: string
  name: string
  category: 'BALLS' | 'CONES' | 'BIBS' | 'GOAL_NETS' | 'FIRST_AID' | 'AGILITY_LADDER' | 'OTHER'
  totalQuantity: number
  availableQuantity: number
  checkedOutQuantity: number
  condition: 'EXCELLENT' | 'GOOD' | 'WORN' | 'DAMAGED'
  lastCheckedOutBy?: string
  lastCheckedOutDate?: string
}

export interface StaffSafeguardingRecord {
  id: string
  academySlug: string
  staffName: string
  role: 'HEAD_COACH' | 'ASST_COACH' | 'PHYSIO' | 'ACADEMY_ADMIN'
  policeVerificationStatus: 'VERIFIED' | 'IN_PROGRESS' | 'PENDING'
  policeVerificationRef?: string
  verificationDate?: string
  pocsoTrainingCompleted: boolean
  firstAidCertified: boolean
  contactPhone: string
}

export interface SafetyIncidentRecord {
  id: string
  academySlug: string
  incidentDate: string
  studentName: string
  batchName: string
  incidentType: 'INJURY_MINOR' | 'INJURY_MAJOR' | 'HEAT_EXHAUSTION' | 'EQUIPMENT_FAIL' | 'BEHAVIORAL'
  description: string
  firstAidAdministered: string
  doctorConsulted: boolean
  parentNotifiedAt?: string
  rtpClearance: 'CLEARED' | 'REHABILITATION' | 'RESTRICTED'
  status: 'OPEN' | 'RESOLVED'
}

const STORAGE_KEYS = {
  KITS: 'khelgrid_academy_kits_store',
  EQUIPMENT: 'khelgrid_academy_equipment_store',
  SAFEGUARDING: 'khelgrid_academy_safeguarding_store',
  INCIDENTS: 'khelgrid_academy_incidents_store',
}

const memoryStore = new Map<string, unknown>()

export function clearAcademyInventoryMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.KITS)
      window.localStorage.removeItem(STORAGE_KEYS.EQUIPMENT)
      window.localStorage.removeItem(STORAGE_KEYS.SAFEGUARDING)
      window.localStorage.removeItem(STORAGE_KEYS.INCIDENTS)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = window.localStorage.getItem(key)
      if (item) return JSON.parse(item) as T
    } catch {
      // ignore
    }
  }
  return (memoryStore.get(key) as T) ?? defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  memoryStore.set(key, value)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-seeded Default Data
// ---------------------------------------------------------------------------

export const DEFAULT_KITS: KitDistributionItem[] = [
  {
    id: 'kit-1',
    academySlug: 'delhi-football-academy',
    studentId: 'st-01',
    studentName: 'Aarav Sharma',
    batchName: 'Morning U-15 Elite Batch',
    squadNumber: 10,
    jerseySize: 'M',
    hasShorts: true,
    hasSocks: true,
    status: 'DELIVERED',
    dispatchedDate: '2026-11-10',
    notes: 'Home & Away match kits provided',
  },
  {
    id: 'kit-2',
    academySlug: 'delhi-football-academy',
    studentId: 'st-02',
    studentName: 'Vihaan Verma',
    batchName: 'Morning U-15 Elite Batch',
    squadNumber: 7,
    jerseySize: 'M',
    hasShorts: true,
    hasSocks: true,
    status: 'DELIVERED',
    dispatchedDate: '2026-11-10',
  },
  {
    id: 'kit-3',
    academySlug: 'delhi-football-academy',
    studentId: 'st-03',
    studentName: 'Ishaan Gupta',
    batchName: 'Evening Grassroots Juniors',
    squadNumber: 14,
    jerseySize: 'S',
    hasShorts: true,
    hasSocks: true,
    status: 'DISPATCHED',
    dispatchedDate: '2026-11-18',
  },
  {
    id: 'kit-4',
    academySlug: 'delhi-football-academy',
    studentId: 'st-04',
    studentName: 'Kabir Mehta',
    batchName: 'Evening Grassroots Juniors',
    squadNumber: 9,
    jerseySize: 'L',
    hasShorts: true,
    hasSocks: false,
    status: 'ALLOCATED',
    notes: 'Pending socks inventory arrival',
  },
]

export const DEFAULT_EQUIPMENT: EquipmentAssetItem[] = [
  {
    id: 'eq-1',
    academySlug: 'delhi-football-academy',
    name: 'Size 5 FIFA Training Match Footballs',
    category: 'BALLS',
    totalQuantity: 24,
    availableQuantity: 18,
    checkedOutQuantity: 6,
    condition: 'EXCELLENT',
    lastCheckedOutBy: 'Coach Rajesh Kumar',
    lastCheckedOutDate: '2026-11-20',
  },
  {
    id: 'eq-2',
    academySlug: 'delhi-football-academy',
    name: 'Fluorescent Training Cones (Set of 50)',
    category: 'CONES',
    totalQuantity: 100,
    availableQuantity: 70,
    checkedOutQuantity: 30,
    condition: 'GOOD',
    lastCheckedOutBy: 'Coach Rajesh Kumar',
    lastCheckedOutDate: '2026-11-20',
  },
  {
    id: 'eq-3',
    academySlug: 'delhi-football-academy',
    name: 'Double-Sided Training Bibs (Neon / Blue)',
    category: 'BIBS',
    totalQuantity: 40,
    availableQuantity: 20,
    checkedOutQuantity: 20,
    condition: 'GOOD',
    lastCheckedOutBy: 'Asst. Coach Vikram',
    lastCheckedOutDate: '2026-11-21',
  },
  {
    id: 'eq-4',
    academySlug: 'delhi-football-academy',
    name: 'SAI Certified First Aid & Trauma Box',
    category: 'FIRST_AID',
    totalQuantity: 3,
    availableQuantity: 3,
    checkedOutQuantity: 0,
    condition: 'EXCELLENT',
    lastCheckedOutBy: 'Lead Physio Dr. Sneha',
    lastCheckedOutDate: '2026-11-15',
  },
  {
    id: 'eq-5',
    academySlug: 'delhi-football-academy',
    name: 'Speed & Agility Footwork Ladders (6m)',
    category: 'AGILITY_LADDER',
    totalQuantity: 6,
    availableQuantity: 4,
    checkedOutQuantity: 2,
    condition: 'GOOD',
    lastCheckedOutBy: 'Coach Rajesh Kumar',
    lastCheckedOutDate: '2026-11-20',
  },
]

export const DEFAULT_SAFEGUARDING: StaffSafeguardingRecord[] = [
  {
    id: 'staff-1',
    academySlug: 'delhi-football-academy',
    staffName: 'Rajesh Kumar',
    role: 'HEAD_COACH',
    policeVerificationStatus: 'VERIFIED',
    policeVerificationRef: 'DL-POL-VER-2025-0982',
    verificationDate: '2025-10-14',
    pocsoTrainingCompleted: true,
    firstAidCertified: true,
    contactPhone: '+919876543210',
  },
  {
    id: 'staff-2',
    academySlug: 'delhi-football-academy',
    staffName: 'Vikram Joshi',
    role: 'ASST_COACH',
    policeVerificationStatus: 'VERIFIED',
    policeVerificationRef: 'DL-POL-VER-2026-0114',
    verificationDate: '2026-02-19',
    pocsoTrainingCompleted: true,
    firstAidCertified: true,
    contactPhone: '+919811223344',
  },
  {
    id: 'staff-3',
    academySlug: 'delhi-football-academy',
    staffName: 'Dr. Sneha Pillai',
    role: 'PHYSIO',
    policeVerificationStatus: 'VERIFIED',
    policeVerificationRef: 'MH-POL-VER-2025-8831',
    verificationDate: '2025-11-05',
    pocsoTrainingCompleted: true,
    firstAidCertified: true,
    contactPhone: '+919822334455',
  },
]

export const DEFAULT_INCIDENTS: SafetyIncidentRecord[] = [
  {
    id: 'inc-1',
    academySlug: 'delhi-football-academy',
    incidentDate: '2026-11-18',
    studentName: 'Vihaan Verma',
    batchName: 'Morning U-15 Elite Batch',
    incidentType: 'INJURY_MINOR',
    description: 'Minor lateral ankle sprain during small-sided scrimmage.',
    firstAidAdministered: 'RICE protocol (Ice compression 20 mins, elevation, crepe bandage applied).',
    doctorConsulted: false,
    parentNotifiedAt: '2026-11-18 07:45 AM via WhatsApp call',
    rtpClearance: 'REHABILITATION',
    status: 'OPEN',
  },
]

// ---------------------------------------------------------------------------
// 1. Kit Distribution APIs
// ---------------------------------------------------------------------------

export function getAcademyKitDistributions(academySlug: string): KitDistributionItem[] {
  const all = loadFromStorage<KitDistributionItem[]>(STORAGE_KEYS.KITS, DEFAULT_KITS)
  return all.filter(k => k.academySlug === academySlug)
}

export function saveAcademyKitDistribution(
  kit: Omit<KitDistributionItem, 'id'> & { id?: string }
): KitDistributionItem {
  const all = loadFromStorage<KitDistributionItem[]>(STORAGE_KEYS.KITS, DEFAULT_KITS)
  const id = kit.id || `kit-${Date.now()}`
  const existingIdx = all.findIndex(k => k.id === id)

  const updatedItem: KitDistributionItem = {
    ...kit,
    id,
  }

  let updatedList: KitDistributionItem[]
  if (existingIdx >= 0) {
    updatedList = [...all]
    updatedList[existingIdx] = updatedItem
  } else {
    updatedList = [updatedItem, ...all]
  }

  saveToStorage(STORAGE_KEYS.KITS, updatedList)
  return updatedItem
}

// ---------------------------------------------------------------------------
// 2. Equipment Management APIs
// ---------------------------------------------------------------------------

export function getAcademyEquipment(academySlug: string): EquipmentAssetItem[] {
  const all = loadFromStorage<EquipmentAssetItem[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT)
  return all.filter(e => e.academySlug === academySlug)
}

export function checkoutEquipment(
  itemId: string,
  quantity: number,
  checkedOutBy: string
): { success: boolean; message: string; item?: EquipmentAssetItem } {
  const all = loadFromStorage<EquipmentAssetItem[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT)
  const item = all.find(e => e.id === itemId)

  if (!item) {
    return { success: false, message: 'Equipment item not found.' }
  }

  if (item.availableQuantity < quantity) {
    return {
      success: false,
      message: `Only ${item.availableQuantity} units available for checkout. Requested quantity exceeds stock.`,
    }
  }

  item.availableQuantity -= quantity
  item.checkedOutQuantity += quantity
  item.lastCheckedOutBy = checkedOutBy
  item.lastCheckedOutDate = new Date().toISOString().slice(0, 10)

  saveToStorage(STORAGE_KEYS.EQUIPMENT, all)
  return {
    success: true,
    message: `Checked out ${quantity} units of ${item.name} to ${checkedOutBy}.`,
    item,
  }
}

export function returnEquipment(
  itemId: string,
  quantity: number
): { success: boolean; message: string; item?: EquipmentAssetItem } {
  const all = loadFromStorage<EquipmentAssetItem[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT)
  const item = all.find(e => e.id === itemId)

  if (!item) {
    return { success: false, message: 'Equipment item not found.' }
  }

  const returnQty = Math.min(quantity, item.checkedOutQuantity)
  item.availableQuantity += returnQty
  item.checkedOutQuantity -= returnQty

  saveToStorage(STORAGE_KEYS.EQUIPMENT, all)
  return {
    success: true,
    message: `Returned ${returnQty} units of ${item.name} back to locker inventory.`,
    item,
  }
}

// ---------------------------------------------------------------------------
// 3. Staff Safeguarding & POCSO Compliance APIs
// ---------------------------------------------------------------------------

export function getAcademyStaffSafeguarding(academySlug: string): StaffSafeguardingRecord[] {
  const all = loadFromStorage<StaffSafeguardingRecord[]>(STORAGE_KEYS.SAFEGUARDING, DEFAULT_SAFEGUARDING)
  return all.filter(s => s.academySlug === academySlug)
}

export function saveStaffSafeguarding(
  record: Omit<StaffSafeguardingRecord, 'id'> & { id?: string }
): StaffSafeguardingRecord {
  const all = loadFromStorage<StaffSafeguardingRecord[]>(STORAGE_KEYS.SAFEGUARDING, DEFAULT_SAFEGUARDING)
  const id = record.id || `staff-${Date.now()}`
  const existingIdx = all.findIndex(s => s.id === id)

  const updatedItem: StaffSafeguardingRecord = {
    ...record,
    id,
  }

  let updatedList: StaffSafeguardingRecord[]
  if (existingIdx >= 0) {
    updatedList = [...all]
    updatedList[existingIdx] = updatedItem
  } else {
    updatedList = [updatedItem, ...all]
  }

  saveToStorage(STORAGE_KEYS.SAFEGUARDING, updatedList)
  return updatedItem
}

// ---------------------------------------------------------------------------
// 4. Incident & Medical Log APIs
// ---------------------------------------------------------------------------

export function getAcademySafetyIncidents(academySlug: string): SafetyIncidentRecord[] {
  const all = loadFromStorage<SafetyIncidentRecord[]>(STORAGE_KEYS.INCIDENTS, DEFAULT_INCIDENTS)
  return all.filter(i => i.academySlug === academySlug)
}

export function recordSafetyIncident(
  incident: Omit<SafetyIncidentRecord, 'id' | 'incidentDate'> & { id?: string; incidentDate?: string }
): SafetyIncidentRecord {
  const all = loadFromStorage<SafetyIncidentRecord[]>(STORAGE_KEYS.INCIDENTS, DEFAULT_INCIDENTS)
  const id = incident.id || `inc-${Date.now()}`
  const newInc: SafetyIncidentRecord = {
    ...incident,
    id,
    incidentDate: incident.incidentDate || new Date().toISOString().slice(0, 10),
  }

  const updated = [newInc, ...all]
  saveToStorage(STORAGE_KEYS.INCIDENTS, updated)
  return newInc
}
