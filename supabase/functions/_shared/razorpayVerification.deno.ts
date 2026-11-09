import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { classifyProviderPayment, fetchRazorpayPayment } from './razorpayVerification.ts'
const expected = { paymentId: 'pay_test_123', providerOrderId: 'order_test_123', amountPaise: 12550, currency: 'INR' }
const captured = { id: expected.paymentId, order_id: expected.providerOrderId, amount: 12550, currency: 'INR', status: 'captured', captured: true }
Deno.test('accepts only exact captured provider payment', () => assertEquals(classifyProviderPayment(captured, expected).disposition, 'captured'))
Deno.test('rejects mismatched payment ID, provider order, amount and currency', () => {
  for (const payment of [{ ...captured, id: 'pay_other' }, { ...captured, order_id: 'order_other' }, { ...captured, amount: 12549 }, { ...captured, currency: 'USD' }]) assertEquals(classifyProviderPayment(payment, expected).disposition, 'mismatch')
})
Deno.test('authorized payment is not settled', () => assertEquals(classifyProviderPayment({ ...captured, status: 'authorized', captured: false }, expected).disposition, 'authorized'))
Deno.test('failed and refunded payments are not settled', () => {
  assertEquals(classifyProviderPayment({ ...captured, status: 'failed', captured: false }, expected).disposition, 'failed')
  assertEquals(classifyProviderPayment({ ...captured, status: 'refunded', captured: false }, expected).disposition, 'refunded')
  assertEquals(classifyProviderPayment({ ...captured, amount_refunded: 100 }, expected).disposition, 'refunded')
})
Deno.test('provider API transport failure is surfaced for retry', async () => {
  await assertRejects(() => fetchRazorpayPayment('pay_test_123', 'rzp_test_key', 'secret', async () => new Response('unavailable', { status: 503 })), Error, 'RAZORPAY_API_503')
})
