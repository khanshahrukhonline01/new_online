# Phase 5.7.5 — Payment and Athlete Moderation Runbook

**Scope:** development project first. Do not point these instructions at production until separately approved.

## Payment registration behavior

The browser calls the `register-payment-intent` Edge Function. UPI checkout remains disabled until `VITE_KHELGRID_UPI_VPA` is set to the merchant's independently verified UPI ID in the development Vercel environment. Verify the bank-app payee name before enabling it. The function uses the server-side `SUPABASE_SERVICE_ROLE_KEY`; this key must never be copied into frontend variables, browser storage, GitHub source, or client requests.

Accepted payment intent behavior:

- Online UPI for verified-price venue bookings and listing plans: `pending_verification`.
- Pay at venue: `pay_at_venue`, never marked settled by the browser.
- Pickup matches: pay-at-venue only.
- Paid trial and membership checkout are intentionally disabled until their target registration/settlement workflows exist.
- Card/NetBanking is disabled until a server-created Razorpay order and complete checkout flow are implemented.

The server recalculates amounts from the database or the server-side plan catalogue. A client-supplied amount or status is not authoritative.

## Manual UPI verification

An UPI UTR is only a customer-supplied reference. It is not proof of payment.

An authorized platform administrator must independently match the UTR and exact credited amount against the merchant bank statement before using the RPC.

The RPC accepts only pending UPI payments linked to a pending venue booking or listing subscription. It rejects unsupported target types, mismatched references, mismatched amounts and non-admin callers.

Example for a verified ₹300 credit (amount is supplied in paise):

```sql
SELECT public.admin_verify_manual_payment(
  'KG_ORD_EXAMPLE_ABCDEF123456',
  '123456789012',
  30000,
  'Matched UTR and exact credit in merchant bank statement'
);
```

Do not use a customer screenshot alone as settlement evidence. The function writes an audit record to `public.payment_manual_verification_audit`. That table is not directly readable by browser roles.

## Razorpay deployment prerequisites

The repository includes `verify-razorpay-payment` and `razorpay-webhook`. Their source code is not proof that they are deployed.

Before enabling Razorpay checkout:

1. Confirm the merchant UPI ID and configure `VITE_KHELGRID_UPI_VPA` in the development Vercel environment. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` as Supabase Edge Function secrets for the development project.
2. Implement and verify server-side Razorpay order creation. Do not create gateway orders using a client-supplied amount.
3. Deploy `verify-razorpay-payment` with JWT verification enabled.
4. Deploy `razorpay-webhook` with JWT verification disabled only because it validates Razorpay's webhook HMAC itself.
5. Configure the webhook URL and secret in the Razorpay dashboard.
6. Test captured, authorized-but-not-captured, invalid-signature, duplicate-event and amount/currency-mismatch cases.
7. Confirm the payment and target records in the development database.

Until all seven steps pass, keep Card/NetBanking checkout disabled.

## Athlete moderation

Use the authenticated administrator RPC:

```sql
SELECT public.moderate_athlete_profile(
  '<athlete-profile-uuid>',
  'published',
  'verified',
  'Reviewed identity and supporting evidence'
);
```

Allowed publication states: `draft`, `published`, `archived`.

Allowed verification states: `community`, `verified`, `pro`, `rejected`.

The function checks the administrator role and writes an immutable moderation audit row. Athlete owners cannot update publication or verification columns directly.

## Development deployment order

After PR approval and merge:

1. Apply migration `20261109100000_phase5_7_5_secure_payment_registration_and_athlete_moderation.sql` to development project `hznsbxvovjxvmnchzzqt`.
2. Re-query payment/subscription table grants, RLS policies, function signatures and defaults.
3. Deploy `register-payment-intent` with JWT verification enabled.
4. Confirm the function appears in the project's deployed Edge Function inventory.
5. Test invalid amount, unsupported target, rate limit, idempotent retry, UTR mismatch and booking-link mismatch. Invalid cases must create no new payment row.
6. Verify one controlled pending venue intent and one pending listing plan, then manually verify only after bank-side evidence exists.
7. Do not deploy to or modify production as part of this phase.
