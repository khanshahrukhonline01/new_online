export type SettlementDisposition = 'processed' | 'failed_retryable' | 'failed_terminal'

export interface SettlementResult {
  disposition: SettlementDisposition
  reason: string
}

/**
 * A transport/database RPC error is retryable. A returned business-level
 * settlement error is quarantined as terminal for operator review. Only an
 * explicit successful settlement response is eligible for processed status.
 */
export function classifySettlementResult(
  data: unknown,
  rpcError: { message?: string } | null,
): SettlementResult {
  if (rpcError) {
    return {
      disposition: 'failed_retryable',
      reason: rpcError.message || 'Settlement RPC failed before returning a result',
    }
  }

  if (!data || typeof data !== 'object') {
    return {
      disposition: 'failed_retryable',
      reason: 'Settlement RPC returned an empty or invalid result',
    }
  }

  const result = data as Record<string, unknown>
  if (result.status === 'success') {
    return { disposition: 'processed', reason: '' }
  }

  if (result.status === 'error') {
    const code = typeof result.error_code === 'string' ? result.error_code : 'SETTLEMENT_REJECTED'
    const message = typeof result.message === 'string' ? result.message : 'Settlement rejected by database'
    return {
      disposition: 'failed_terminal',
      reason: `${code}: ${message}`.slice(0, 2000),
    }
  }

  return {
    disposition: 'failed_retryable',
    reason: 'Settlement RPC returned an unrecognized result; refusing to mark webhook processed',
  }
}
