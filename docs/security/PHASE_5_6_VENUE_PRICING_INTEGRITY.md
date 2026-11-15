# KhelGrid Security Programme — Phase 5.6
## Venue Tariff & Court-Specific Pricing Integrity Architecture

> **Document ID:** SEC-ARCH-VENUE-PRICING  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Target Database:** Supabase Development Project `hznsbxvovjxvmnchzzqt`  
> **Procedures Modified:** `public.reserve_venue_slot_atomic`, table `public.venues`  
> **Production Status:** `https://khelgrid.com/` — Strictly Out of Scope / 100% Untouched  
> **Date:** November 8, 2026  

---

## 1. Domain Model Decoupling

KhelGrid operates distinct commercial entities with separate economic models that must never be conflated:

1. **B2B Venue Listing Subscription (`venues.plan_price`)**:
   - Represents the monthly SaaS subscription paid by venue administrators to list their facility on KhelGrid (e.g. ₹499/mo for Starter, ₹1,499/mo for Pro).
   - Defined in `public.venues.plan_price` and table `public.listing_subscriptions`.
2. **Player Court Booking Hourly Fee (`venues.slot_hourly_fee`)**:
   - Represents the hourly turf or court rental tariff paid by athletes/players booking a venue slot.
   - Defined optionally at the venue level in `public.venues.slot_hourly_fee`.
3. **Court-Specific Tariff (`venue_courts.hourly_price_paise`)**:
   - Specific pricing per court within a multi-court complex (e.g. Court 1 Standard ₹600/hr, Court 2 Floodlit ₹1,200/hr).
   - Stored in integer paise in `public.venue_courts.hourly_price_paise`.

---

## 2. Remediation of Unverified Default Pricing

### Defect Identified in Phase 5.5
Migration `20261108130000` created `venues.slot_hourly_fee DEFAULT 800` and executed:
```sql
UPDATE public.venues SET slot_hourly_fee = 800 WHERE slot_hourly_fee IS NULL;
```
This arbitrarily assigned a ₹800 commercial tariff to all venues, including government Sports Authority of India (SAI) National Centres of Excellence, state stadia, and unpriced partner listings. Furthermore, `reserve_venue_slot_atomic` fell back to `800` when neither court nor venue tariff was set.

### Phase 5.6 Forward-Only Correction
1. **Drop Default Constraint**:
   ```sql
   ALTER TABLE public.venues ALTER COLUMN slot_hourly_fee DROP DEFAULT;
   ```
2. **Nullify Unverified Pricing for Government & Non-Commercial Facilities**:
   ```sql
   UPDATE public.venues
   SET slot_hourly_fee = NULL
   WHERE government_facility = true;
   ```
3. **Preserve Valid Commercial Tariffs**:
   Existing valid tariffs explicitly configured by venue owners are preserved.

---

## 3. Authoritative Pricing Resolution Hierarchy

When reserving a court slot via `public.reserve_venue_slot_atomic(p_venue_id, p_slot_date, p_slot_time, p_court_number, ...)`:

```
                      [Reservation Request]
                      (p_venue_id, p_court_number)
                               │
                               ▼
               ┌───────────────────────────────┐
               │  Query public.venue_courts    │
               │  matching p_court_number      │
               └───────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼ Found Court Tariff                  ▼ No Court Tariff
   [v_court_price_paisa > 0]             ┌───────────────────────────────┐
            │                            │ Query public.venues           │
            │ Set price =                │ slot_hourly_fee               │
            │ round(court_price / 100)   └───────────────┬───────────────┘
            │                                            │
            │                             ┌──────────────┴──────────────┐
            │                             ▼ Valid Venue Tariff          ▼ No Valid Tariff
            │                    [slot_hourly_fee > 0]           [slot_hourly_fee IS NULL]
            │                             │                             │
            │                             │ Set price =                 ▼
            │                             │ slot_hourly_fee      REJECT RESERVATION
            │                             │                      Return: PRICE_UNRESOLVED
            └─────────────────────────────┼─────────────────────────────┘
                                          ▼
                               [Authoritative Price]
                               (Asserted against client)
```

### Specific Court Matching Pattern
To ensure the correct court's price is selected, the query matches `p_court_number` (`v_court`):
```sql
SELECT hourly_price_paise
INTO v_court_price_paisa
FROM public.venue_courts
WHERE venue_id = v_venue_record.id
  AND is_bookable = true
  AND (
    name = 'Court ' || v_court::text
    OR name = 'Court' || v_court::text
    OR name = v_court::text
    OR name ILIKE '%Court ' || v_court::text
    OR name ILIKE '%Court ' || v_court::text || ' %'
    OR name ILIKE '%Court ' || v_court::text || ')'
    OR name ILIKE '% ' || v_court::text
    OR name ILIKE '%' || v_court::text || '%'
  )
ORDER BY
  CASE
    WHEN name = 'Court ' || v_court::text THEN 1
    WHEN name = 'Court' || v_court::text THEN 2
    WHEN name = v_court::text THEN 3
    ELSE 4
  END
LIMIT 1;
```

---

## 4. Rejection Policy: `PRICE_UNRESOLVED`

If neither court-specific pricing nor venue-level pricing is configured:
- The server **aborts the reservation immediately**.
- It returns:
  ```json
  {
    "success": false,
    "error": "PRICE_UNRESOLVED",
    "message": "No authoritative booking tariff is configured for this venue or court. Please select another facility."
  }
  ```
- No temporary hold is created.
- No payment order is generated.
- No unverified or guessed price is presented to the user.
