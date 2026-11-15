import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { classifySettlementResult } from './webhookSettlement.ts'

Deno.test('explicit successful settlement is processed', () => {
  assertEquals(
    classifySettlementResult({ status: 'success', order_id: 'KG-1' }, null),
    { disposition: 'processed', reason: '' },
  )
})

Deno.test('database RPC transport error is retryable', () => {
  assertEquals(
    classifySettlementResult(null, { message: 'connection reset' }),
    { disposition: 'failed_retryable', reason: 'connection reset' },
  )
})

Deno.test('business settlement rejection is quarantined, never processed', () => {
  const result = classifySettlementResult({
    status: 'error',
    error_code: 'AMOUNT_MISMATCH',
    message: 'Recorded amount does not match',
  }, null)
  assertEquals(result.disposition, 'failed_terminal')
  assertEquals(result.reason, 'AMOUNT_MISMATCH: Recorded amount does not match')
})

Deno.test('empty RPC response is retryable and not processed', () => {
  assertEquals(
    classifySettlementResult(null, null),
    {
      disposition: 'failed_retryable',
      reason: 'Settlement RPC returned an empty or invalid result',
    },
  )
})

Deno.test('unknown RPC response is retryable and not processed', () => {
  assertEquals(
    classifySettlementResult({ status: 'pending' }, null).disposition,
    'failed_retryable',
  )
})

Deno.test('error messages are capped to webhook ledger limit', () => {
  const result = classifySettlementResult({
    status: 'error',
    error_code: 'REJECTED',
    message: 'x'.repeat(3000),
  }, null)
  assertEquals(result.disposition, 'failed_terminal')
  assertEquals(result.reason.length, 2000)
})
