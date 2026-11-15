import { describe, expect, it } from 'vitest';
import {
  calculateCommissionSplit,
  getHostPayoutAccount,
  saveHostPayoutAccount,
  getHostSettlements,
  requestHostSettlement,
  PLATFORM_COMMISSION_PERCENT,
} from './payoutService';

describe('Host Payouts & Commission Settlement Service', () => {
  it('correctly calculates 8% platform commission and net host payout', () => {
    const calculation = calculateCommissionSplit(10000);
    expect(calculation.grossAmount).toBe(10000);
    expect(calculation.platformFeeRate).toBe(PLATFORM_COMMISSION_PERCENT);
    expect(calculation.platformFeeAmount).toBe(800);
    expect(calculation.netPayoutAmount).toBe(9200);

    const oddCalculation = calculateCommissionSplit(1499);
    expect(oddCalculation.grossAmount).toBe(1499);
    expect(oddCalculation.platformFeeAmount).toBe(120); // Math.round(1499 * 0.08) = 120
    expect(oddCalculation.netPayoutAmount).toBe(1379);
  });

  it('retrieves and updates host payout account credentials', async () => {
    const initial = await getHostPayoutAccount('test-partner-1');
    expect(initial.beneficiaryName).toBeTruthy();

    const updated = await saveHostPayoutAccount({
      hostId: 'test-partner-1',
      beneficiaryName: 'Karnataka Cricket Academy',
      payoutMethod: 'upi',
      upiId: 'kca@icici',
    });

    expect(updated.beneficiaryName).toBe('Karnataka Cricket Academy');
    expect(updated.upiId).toBe('kca@icici');
    expect(updated.isVerified).toBe(true);
  });

  it('generates an audited settlement record with UTR reference upon payout request', async () => {
    const payout = await requestHostSettlement('test-partner-1', 5000, 'kca@icici', 'upi');

    expect(payout.grossAmount).toBe(5000);
    expect(payout.platformFeeAmount).toBe(400);
    expect(payout.netPayoutAmount).toBe(4600);
    expect(payout.payoutRef).toMatch(/^PO-\d{8}-[A-Z0-9]+$/);
    expect(payout.utrNumber).toMatch(/^UTR-\d+$/);
    expect(payout.status).toBe('settled');

    const history = await getHostSettlements('test-partner-1');
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].payoutRef).toBe(payout.payoutRef);
  });
});
