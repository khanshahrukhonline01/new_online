export interface RazorpayPayment {
  id: string
  entity?: string
  amount: number
  currency: string
  status: string
  order_id: string | null
  captured: boolean
  amount_refunded?: number
  refund_status?: string | null
}
export type ProviderPaymentDisposition = 'captured' | 'authorized' | 'failed' | 'refunded' | 'mismatch'
export function classifyProviderPayment(payment: RazorpayPayment, expected: { paymentId: string; providerOrderId: string; amountPaise: number; currency: string }): { disposition: ProviderPaymentDisposition; reason: string } {
  if (payment.id !== expected.paymentId || payment.order_id !== expected.providerOrderId || payment.amount !== expected.amountPaise || payment.currency?.toUpperCase() !== expected.currency.toUpperCase()) return { disposition: 'mismatch', reason: 'Provider payment identifiers, order, amount or currency do not match the KhelGrid order.' }
  if (payment.status === 'refunded' || (payment.amount_refunded ?? 0) > 0 || payment.refund_status) return { disposition: 'refunded', reason: 'Provider reports a refunded or partially refunded payment; it cannot settle a new order.' }
  if (payment.status === 'captured' && payment.captured === true) return { disposition: 'captured', reason: '' }
  if (payment.status === 'authorized' && payment.captured !== true) return { disposition: 'authorized', reason: 'Payment is authorized but not captured.' }
  return { disposition: 'failed', reason: `Provider payment is not captured (status: ${payment.status || 'unknown'}).` }
}
export async function fetchRazorpayPayment(paymentId: string, keyId: string, keySecret: string, fetchImpl: typeof fetch = fetch): Promise<RazorpayPayment> {
  const response = await fetchImpl(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: { Authorization: `Basic ${btoa(`${keyId.trim()}:${keySecret.trim()}`)}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`RAZORPAY_API_${response.status}`)
  return await response.json() as RazorpayPayment
}

export async function verifyHmacSha256(payload: string, secret: string, supplied: string): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
  const expected = Array.from(signature).map(v => v.toString(16).padStart(2, '0')).join('')
  const a = new TextEncoder().encode(expected.toLowerCase())
  const b = new TextEncoder().encode(supplied.trim().toLowerCase())
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
