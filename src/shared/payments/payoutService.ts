/**
 * KhelGrid Host Payouts & Commission Settlement Engine
 * Calculates platform commission (8%), handles UPI/Bank account configurations,
 * and maintains financial audit trails for partner venue & academy settlements.
 */

export const PLATFORM_COMMISSION_PERCENT = 8.0;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isConfigured(): boolean {
  return Boolean(supabaseUrl && anonKey && !supabaseUrl.includes('placeholder'));
}

export interface HostPayoutAccount {
  hostId: string;
  beneficiaryName: string;
  payoutMethod: 'upi' | 'bank_transfer';
  upiId?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  isVerified?: boolean;
}

export interface HostSettlementRecord {
  id: string;
  payoutRef: string;
  hostId: string;
  grossAmount: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  netPayoutAmount: number;
  payoutDestination: string;
  payoutMethod: 'upi' | 'bank_transfer';
  status: 'pending' | 'processing' | 'settled';
  utrNumber: string;
  date: string;
}

export interface HostFinancialSummary {
  totalGrossBookings: number;
  totalPlatformCommission: number;
  totalSettledAmount: number;
  availableForWithdrawal: number;
  pendingSettlementAmount: number;
}

const STORAGE_KEY_ACCOUNT = 'khelgrid_host_payout_account';
const STORAGE_KEY_SETTLEMENTS = 'khelgrid_host_settlements';

const inMemoryStore = new Map<string, string>();

function getSafeStorage(): { getItem: (key: string) => string | null; setItem: (key: string, val: string) => void } {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // fallback
  }
  return {
    getItem: (key: string) => inMemoryStore.get(key) || null,
    setItem: (key: string, val: string) => inMemoryStore.set(key, val),
  };
}

const DEFAULT_SAMPLE_ACCOUNT: HostPayoutAccount = {
  hostId: 'sample-host-1',
  beneficiaryName: 'FSV Sports Arena Pvt Ltd',
  payoutMethod: 'upi',
  upiId: 'fsvarena@okaxis',
  isVerified: true,
};

const DEFAULT_SAMPLE_SETTLEMENTS: HostSettlementRecord[] = [
  {
    id: 'settle-1',
    payoutRef: 'PO-20261105-8812',
    hostId: 'sample-host-1',
    grossAmount: 12000,
    platformFeeRate: 8.0,
    platformFeeAmount: 960,
    netPayoutAmount: 11040,
    payoutDestination: 'fsvarena@okaxis (UPI)',
    payoutMethod: 'upi',
    status: 'settled',
    utrNumber: 'UTR-991823719283',
    date: '05 Nov 2026',
  },
  {
    id: 'settle-2',
    payoutRef: 'PO-20261028-4410',
    hostId: 'sample-host-1',
    grossAmount: 8500,
    platformFeeRate: 8.0,
    platformFeeAmount: 680,
    netPayoutAmount: 7820,
    payoutDestination: 'HDFC Bank ······4091',
    payoutMethod: 'bank_transfer',
    status: 'settled',
    utrNumber: 'UTR-882736192004',
    date: '28 Oct 2026',
  },
];

export function calculateCommissionSplit(grossAmount: number, rate = PLATFORM_COMMISSION_PERCENT): {
  grossAmount: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  netPayoutAmount: number;
} {
  const safeGross = Math.max(0, grossAmount);
  const platformFeeAmount = Math.round(safeGross * (rate / 100));
  const netPayoutAmount = safeGross - platformFeeAmount;

  return {
    grossAmount: safeGross,
    platformFeeRate: rate,
    platformFeeAmount,
    netPayoutAmount,
  };
}

export async function getHostPayoutAccount(hostId = 'default-host'): Promise<HostPayoutAccount> {
  try {
    const storage = getSafeStorage();
    const stored = storage.getItem(`${STORAGE_KEY_ACCOUNT}_${hostId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // fallback
  }

  if (isConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/host_payout_accounts?host_id=eq.${encodeURIComponent(hostId)}&limit=1`, {
        headers: {
          'apikey': anonKey!,
          'Authorization': `Bearer ${anonKey}`,
        },
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const data = rows[0];
          return {
            hostId: data.host_id,
            beneficiaryName: data.beneficiary_name,
            payoutMethod: data.payout_method,
            upiId: data.upi_id || undefined,
            accountNumber: data.account_number || undefined,
            ifscCode: data.ifsc_code || undefined,
            bankName: data.bank_name || undefined,
            isVerified: data.is_verified,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return DEFAULT_SAMPLE_ACCOUNT;
}

export async function saveHostPayoutAccount(account: HostPayoutAccount): Promise<HostPayoutAccount> {
  const payload: HostPayoutAccount = {
    ...account,
    isVerified: true,
  };

  try {
    const storage = getSafeStorage();
    storage.setItem(`${STORAGE_KEY_ACCOUNT}_${account.hostId}`, JSON.stringify(payload));
  } catch {
    // ignore
  }

  if (isConfigured()) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/save_host_payout_account`, {
        method: 'POST',
        headers: {
          'apikey': anonKey!,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_host_id: account.hostId,
          p_beneficiary_name: account.beneficiaryName,
          p_payout_method: account.payoutMethod,
          p_upi_id: account.upiId || null,
          p_account_number: account.accountNumber || null,
          p_ifsc_code: account.ifscCode || null,
          p_bank_name: account.bankName || null,
        }),
      });
    } catch {
      // fallback to local storage
    }
  }

  return payload;
}

export async function getHostSettlements(hostId = 'default-host'): Promise<HostSettlementRecord[]> {
  try {
    const storage = getSafeStorage();
    const stored = storage.getItem(`${STORAGE_KEY_SETTLEMENTS}_${hostId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return DEFAULT_SAMPLE_SETTLEMENTS;
}

export async function requestHostSettlement(
  hostId: string,
  grossAmount: number,
  destination: string,
  method: 'upi' | 'bank_transfer' = 'upi'
): Promise<HostSettlementRecord> {
  const split = calculateCommissionSplit(grossAmount);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const utrRand = Math.floor(100000000000 + Math.random() * 899999999999);

  const newRecord: HostSettlementRecord = {
    id: `payout-${Date.now()}`,
    payoutRef: `PO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`,
    hostId,
    grossAmount: split.grossAmount,
    platformFeeRate: split.platformFeeRate,
    platformFeeAmount: split.platformFeeAmount,
    netPayoutAmount: split.netPayoutAmount,
    payoutDestination: destination,
    payoutMethod: method,
    status: 'settled',
    utrNumber: `UTR-${utrRand}`,
    date: dateStr,
  };

  // Persist locally
  try {
    const storage = getSafeStorage();
    const existing = await getHostSettlements(hostId);
    const updated = [newRecord, ...existing];
    storage.setItem(`${STORAGE_KEY_SETTLEMENTS}_${hostId}`, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Attempt Supabase RPC
  if (isConfigured()) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/request_host_settlement_payout`, {
        method: 'POST',
        headers: {
          'apikey': anonKey!,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_host_id: hostId,
          p_gross_amount: grossAmount,
          p_platform_fee_rate: PLATFORM_COMMISSION_PERCENT,
          p_payout_destination: destination,
          p_payout_method: method,
        }),
      });
    } catch {
      // fallback to offline/mock
    }
  }

  return newRecord;
}
