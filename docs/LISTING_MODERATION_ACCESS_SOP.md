# Listing Moderation Access & Operations Standard Operating Procedure (SOP)

**Document Version:** 3.0  
**Phase:** Phase 3 – Complete Listing Moderation & Publication System  
**Audience:** Platform Administrators, Database Operators, and Authorized Moderators  

---

## 1. Security Architecture & Authorization Model

Access to the KhelGrid Moderation Desk (`/admin/moderation`) and all associated review, approval, publication, and unpublication capabilities is governed strictly by the database authorization allowlist: `public.listing_moderators`.

### Key Security Invariants
- **Authentication Pause Maintained:** Public user self-registration and generic sign-ins remain globally paused. General visitors cannot create accounts or sign in.
- **Server-Side Allowlist Verification:** Moderation privileges are verified in PostgreSQL via `is_listing_moderator(auth.uid())` which checks that the calling user has `is_active = true` in `public.listing_moderators`.
- **Zero Client-Side Trust:** Client-side roles, localStorage items, query parameters, or JWT metadata claims are NEVER trusted for moderation authorization.
- **Least-Privilege RPC Boundaries:**
  - `anon` and unauthenticated visitors cannot view or call moderator RPCs.
  - Non-moderator authenticated accounts are denied execution with explicit authorization exceptions (`KG403` / access denied).
  - Catalogue tables (`venues`, `academies`, `coaches`, `events`, `opportunities`, `pickup_games`, `sports`) do not have broad `INSERT`/`UPDATE` grants to `authenticated`. All publication operations are strictly mediated through verified `SECURITY DEFINER` procedures with internal allowlist checks.

---

## 2. Procedure for Authorizing the First Moderator Account

Because there are no active moderators in the development database by default, an administrator must authorize the initial moderator using the secure procedure below.

> [!CAUTION]
> **NEVER** expose the Supabase `service_role` key to client browsers, code repositories, shell histories, or frontend configuration files. All administrative grant commands must be executed strictly from the Supabase Dashboard SQL Editor or via secure server-side administrative CLI.

### Step 1: Create or Invite the Moderator Account
1. Open the **Supabase Dashboard** for the development project (`hznsbxvovjxvmnchzzqt`).
2. Navigate to **Authentication** > **Users**.
3. Click **Invite User** or **Add User** (Create User with Email & Password).
4. Enter the moderator's verified work email and a strong temporary password.
5. Copy the newly created user's exact **UUID** (`User UID`).

### Step 2: Allowlist the Moderator in the Database
1. In the Supabase Dashboard, open the **SQL Editor**.
2. Run the following transaction-safe allowlist query, replacing the placeholder with the exact copied UUID:

```sql
begin;

insert into public.listing_moderators (user_id, is_active, notes)
values (
  '00000000-0000-0000-0000-000000000000', -- REPLACE WITH ACTUAL USER UID
  true,
  'Initial authorized listing moderator for Phase 3'
)
on conflict (user_id) do update
set is_active = true,
    updated_at = clock_timestamp();

commit;
```

### Step 3: Verify Moderator Capabilities
1. The moderator logs in at `http://localhost:5173/admin/moderation` (or the Vercel development deployment).
2. The UI will authenticate the session against Supabase Auth, verify allowlist status, and render the Protected Moderation Desk with live counters and status queues.

---

## 3. Moderator Offboarding & Immediate Revocation

To revoke moderation access immediately:

1. Open the Supabase Dashboard **SQL Editor**.
2. Execute the revocation query:

```sql
begin;

update public.listing_moderators
set is_active = false,
    updated_at = clock_timestamp()
where user_id = '00000000-0000-0000-0000-000000000000'; -- TARGET USER UID

commit;
```

3. Under **Authentication** > **Users**, locate the account and select **Ban User** or **Delete User** to terminate any active JWT sessions immediately.

---

## 4. Operational Review Guidelines for Moderators

### 4.1 Claiming and Reviewing a Submission
1. Select a submission from the **Pending Review** or **Resubmitted** tab.
2. Click **Start Review**. This marks the record as `under_review` and assigns your moderator ID to prevent conflicting reviews by colleagues.
3. Review all submitted fields:
   - Verify that the title and category match.
   - Inspect the source URL manually. **Do not click suspicious links or enter credentials on external domains.**
   - Confirm that the location (city, state, coordinates) exists in India.
   - Ensure the submission contains zero unsolicited personally identifiable information (PII) such as personal mobile numbers, home addresses, or private emails of individuals.

### 4.2 Handling Decisions
- **Approve:** If the submission is verified and complete, click **Approve Listing**. Note that this does **not** publish the listing to the public catalogue.
- **Request Corrections:** If minor information is missing (e.g. unclear age limit, missing official link), click **Request Corrections**. Specify clear, polite instructions for the submitter. The submitter will receive this instruction via their tracking key.
- **Reject:** If the submission is fraudulent, spam, duplicate, or outside KhelGrid's scope, click **Reject Submission**. Select or provide an appropriate rejection reason. Internal notes remain private to KhelGrid and are never shown to submitters.

### 4.3 Publication to Catalogue
1. Navigate to the **Approved** tab.
2. Open the approved submission and click **Publish to Catalogue**.
3. Verify or enter the desired URL slug (e.g., `delhi-badminton-academy`).
4. Click **Confirm Publication**.
5. The system performs an atomic insertion into the appropriate catalogue table (`opportunities`, `venues`, `academies`, `coaches`, `events`, `pickup_games`, or `sports`), sets `is_published = true`, and links the published entity ID back to the submission record.

### 4.4 Unpublishing a Catalogue Entity
1. In the **Published** tab, click **Unpublish Listing**.
2. Provide a mandatory reason (e.g., "Venue permanently closed", "Event concluded", "Duplicate entry").
3. Click **Confirm Unpublish**.
4. The system immediately revokes public discovery in the catalogue while preserving all historical submission records, audit logs, and version snapshots.

---

## 5. Incident Handling & Audit Review

If unauthorized actions, compromised credentials, or suspicious submissions are detected:

1. **Lock Down Access:** Revoke the compromised moderator account immediately using Section 3.
2. **Inspect the Audit Ledger:** Query `public.listing_submission_audits` to identify all actions taken by the actor:

```sql
select
  a.created_at,
  a.action,
  a.submission_id,
  a.from_status,
  a.to_status,
  a.notes,
  a.metadata
from public.listing_submission_audits a
where a.actor_id = 'COMPROMISED_USER_UID'
order by a.created_at desc;
```

3. **Revert Unauthorized Changes:**
   - For mistakenly published items, execute `unpublish_listing_submission(submission_id, 'Security rollback')`.
   - For corrupted submission content, retrieve the clean version from `public.listing_submission_versions`.
