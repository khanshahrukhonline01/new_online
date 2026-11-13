# Listing Moderation Access & Operations Standard Operating Procedure (SOP)

**Document Version:** 3.0  
**Phase:** Phase 3 – Complete Listing Moderation & Publication System  
**Audience:** Platform Administrators, Database Operators, and Authorized Moderators  

---

## 1. Security Architecture & Authorization Model

Access to the KhelGrid Moderation Desk (`/admin`) and all associated review, approval, publication, and unpublication capabilities is governed strictly by the database authorization allowlist: `public.listing_moderators`.

### Key Security Invariants
- **Authentication Pause Maintained:** Public user self-registration and generic sign-ins remain globally paused. General visitors cannot create accounts or sign in.
- **Server-Side Allowlist Verification:** Moderation privileges are verified in PostgreSQL via `is_listing_moderator()` which checks that the calling user has `is_active = true` in `public.listing_moderators`.
- **Zero Client-Side Trust:** Client-side roles, localStorage items, query parameters, or JWT metadata claims are NEVER trusted for moderation authorization.
- **Least-Privilege RPC Boundaries:**
  - `anon` and unauthenticated visitors cannot view or call moderator RPCs.
  - Non-moderator authenticated accounts are denied execution with explicit authorization exceptions (`KG403` / access denied).
  - Catalogue tables (`venues`, `academies`, `coaches`, `events`, `opportunities`, `pickup_games`, `sports`) do not have broad `INSERT`/`UPDATE` grants to `authenticated`. All publication operations are strictly mediated through verified `SECURITY DEFINER` procedures with internal allowlist checks.

---

## 2. Procedure for Authorizing the First Super-Admin Account

Because there are no active moderators in the development database by default, a trusted database operator must authorize the first super-admin using the secure procedure below. The super-admin can then grant individual moderator accounts through `/admin/control`.

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

insert into public.listing_moderators (user_id, is_active, role, notes)
values (
  '00000000-0000-0000-0000-000000000000', -- REPLACE WITH ACTUAL USER UID
  true,
  'super_admin',
  'Initial authorized super-admin for Phase 3.1'
)
on conflict (user_id) do update
set is_active = true,
    role = 'super_admin';

commit;
```

### Step 3: Verify Moderator Capabilities
1. The super-admin logs in at `http://localhost:5173/admin` and opens `/admin/control` (or the Vercel development deployment).
2. The UI will authenticate the session against Supabase Auth, verify allowlist status, and render the Protected Moderation Desk with live counters and status queues.

---

## 3. Moderator Offboarding & Immediate Revocation

To revoke moderation access immediately:

1. Open the Supabase Dashboard **SQL Editor**.
2. Execute the revocation query:

```sql
begin;

update public.listing_moderators
set is_active = false
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
- **Approve:** After claiming the item with **Start Review**, record the editorial decision with **Approve Listing**. This does **not** mean the evidence is verified and does **not** publish the listing.
- **Request Corrections:** If minor information is missing (e.g. unclear age limit, missing official link), click **Request Corrections**. Specify clear, polite instructions for the submitter. The submitter will receive this instruction via their tracking key.
- **Reject:** If the submission is fraudulent, spam, duplicate, or outside KhelGrid's scope, click **Reject Submission**. Select or provide an appropriate rejection reason. Internal notes remain private to KhelGrid and are never shown to submitters.

### 4.3 Publication to Catalogue
1. Navigate to the **Approved** tab.
2. Open the approved submission in `/admin/control`.
3. Record category-specific HTTPS evidence, review its outcome, and mark the submission verified only when the evidence rules pass.
4. Enter and save the genuine category-specific publication fields; missing addresses, organizer names, qualifications, hosts, venues, or event times cannot be fabricated.
5. Publish only after editorial approval and evidence verification. The database atomically creates or reuses the correct catalogue record and links it to the submission.

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

## 6. Phase 3.1 Moderator & Super-Admin Control Panel

The development control panel is available at `/admin/control`. It is a protected application route, not a public admin endpoint. The browser UI is only an interface; every read and mutation is re-authorized inside PostgreSQL.

### Roles

- **Moderator:** review submissions, record evidence, review evidence outcomes, make editorial approval/rejection decisions, and set an evidence-verification decision.
- **Super admin:** all moderator capabilities plus inspect the moderator allowlist and grant, change, activate, or revoke moderator access.
- A super admin cannot demote or deactivate the last active super-admin account.
- No role is granted from localStorage, frontend state, URL parameters, or user-editable metadata.

### Bootstrap the first super-admin

The first super-admin must be provisioned by a trusted database operator in the intended development project. This is intentionally not self-service and cannot be done by the control panel before a super-admin exists.

1. Create/invite the operator's account in Supabase Authentication.
2. Copy the exact Auth user UUID.
3. Run this in the development project's SQL Editor, replacing the UUID with the verified Auth user ID:

```sql
begin;
insert into public.listing_moderators (user_id, is_active, role, notes)
values (
  '00000000-0000-0000-0000-000000000000',
  true,
  'super_admin',
  'Initial Phase 3.1 super-admin provisioned by trusted database operator'
)
on conflict (user_id) do update
set is_active = true,
    role = 'super_admin',
    notes = excluded.notes;
commit;
```

This is a privileged bootstrap operation. Never expose the service-role key or grant roles through a public form.

### Evidence verification workflow

1. Start review and claim the submission.
2. Add one or more HTTPS evidence records with an evidence type and a description of what the source establishes.
3. Open each source and record whether it supports, contradicts, or is insufficient for the claim.
4. Mark the submission verified only when at least one item supports the claim, no item contradicts it, and no evidence review remains pending.
5. Record editorial approval separately. Approval alone does not verify identity and does not publish a listing.
6. Enter genuine category-specific publication data. The database rejects missing venue addresses, organizer/venue/date details for events, and sport/venue/host/date details for pickup games.
7. Publish only after both editorial approval and evidence verification. Publication is a separate audited action.
8. Unpublish with a reason. Republishing reuses the linked catalogue row rather than inserting a duplicate.

### Access management

A super admin can use the Super-admin access management section at `/admin/control` to grant or revoke access for an existing Auth user UUID. Every access change is recorded in `listing_moderator_access_audits`. The database blocks removal of the final active super-admin. Moderator access is immediately checked by the RPC on every protected operation.

### Verification and publication are different labels

- `approved` means an editorial moderator accepted the submission for publication consideration.
- `verified` means the evidence workflow met the database's supporting-evidence rules.
- `published` means the record was explicitly copied/activated in the public catalogue after both conditions and category-specific data requirements were satisfied.

A published listing can remain labelled unverified only in legacy data predating Phase 3.1; review and reconcile legacy rows before making verification claims.


---

## 9. Category-specific evidence verification playbook

Use the following as a minimum checklist, not as a substitute for judgement. Every evidence item must have a source URL, a concise statement of what it proves, and a recorded outcome. Evidence must relate to the actual submitted listing, not merely to a similarly named organisation.

### Venue
- Confirm the venue exists at the submitted street/locality address; a city name or map pin alone is not an address.
- Compare the address and facility details against the venue/operator's official source where available.
- Check that the listed sports/courts are actually offered and that photos are current and permitted for use.
- If the operator cannot be independently contacted or the location cannot be corroborated, request more information rather than publishing.

### Coach
- Independently confirm the coach's identity and contact channel.
- Verify every claimed qualification, certification, federation affiliation or employment claim against the issuing body/employer where possible.
- Do not convert years of experience, athlete results or selection claims into facts without supporting evidence.
- A social profile or self-written biography is a lead, not independent proof of a qualification.

### Academy
- Confirm the academy's operating identity and actual training location.
- Independently confirm the programme and the person responsible for it.
- Check claimed affiliations, accreditations, government recognition or partnerships with the named institution.
- Do not imply government recognition or endorsement from a generic association or logo.

### Trial / opportunity
- Locate the organiser's official announcement or independently confirm the organiser through a trusted channel.
- Verify the sport, actual trial date/time, venue, eligibility, age group, gender category (if applicable), registration route and deadline.
- Record any disclosed athlete fee accurately; if the organiser has not disclosed a fee, leave it unknown.
- Do not publish forwarded WhatsApp posters or copied social posts as the sole basis for a high-impact opportunity.

### Event
- Confirm the organiser, schedule, venue and registration source.
- Check that the event dates are current and that the source belongs to the named organiser or recognised authority.
- Do not infer a schedule, host or venue from an old edition of an event.

### Pickup game
- Confirm the host identity and that the host is authorised to organise the session.
- Confirm the actual playing venue, date/time, sport, capacity/participation terms and any stated cost.
- Protect participant personal information; do not expose private phone numbers, invite tokens or participant lists in public listing details.

### Evidence quality and decision outcomes
- **Supports:** the source directly corroborates the specific claim under review.
- **Contradicts:** reliable evidence conflicts with the claim; explain the conflict in reviewer notes and escalate suspected fraud.
- **Insufficient:** the source is inaccessible, indirect, stale, ambiguous or does not establish the claim.
- **Pending:** not yet reviewed. Pending evidence must never be treated as supporting evidence.
- Prefer primary sources: government departments, SAI/MYAS/Khelo India, recognised sports federations, official event/venue/academy websites, issuing institutions and direct confirmation from an independently verified organisational contact.
- Search results, maps, directories, reposted posters, social profiles and messaging screenshots may help locate primary evidence but should not independently establish material claims.
- Capture the date checked and the exact claim supported. Do not store unnecessary identity documents or sensitive personal data.

## 10. Standard review sequence

1. **Intake screening:** check completeness, duplicates, prohibited content, suspicious links and category fit.
2. **Claim extraction:** list the material claims that would appear publicly (identity, address, qualification, organiser, date, venue, eligibility and fees).
3. **Independent evidence:** find primary sources or contact the organisation through a separately verified channel.
4. **Evidence register:** add each source with a short factual description; review it as supports, contradicts or insufficient.
5. **Verification decision:** mark verified only when the required category claims are supported, no contradiction remains unresolved, and no evidence review is pending.
6. **Editorial decision:** separately approve, request corrections or reject. Record clear reasons for adverse decisions.
7. **Publication readiness:** enter only corroborated category-specific facts. Leave unknown values blank.
8. **Publish:** use the protected publication action only after editorial approval, verification and category completeness checks pass.
9. **Post-publication monitoring:** unpublish promptly if evidence becomes invalid, the event expires, the venue closes or a credible report is received. Preserve the audit history.

## 11. Reviewer communication templates

### More information required
"Thank you for submitting this listing to KhelGrid. We could not independently confirm: [specific claim]. Please provide an official source or a contact for the responsible organisation. This request does not guarantee publication. Listing submission and evidence review are free."

### Rejected
"We cannot publish this listing because: [specific, factual reason]. You may submit a corrected listing with supporting evidence. KhelGrid does not charge for listing verification."

### Verified and approved
"Your listing has passed KhelGrid's evidence and editorial checks and is approved for publication. Please notify us if any listed details change. KhelGrid verification is an independent platform review and does not represent government endorsement or accreditation."

## 12. Non-negotiable safeguards
- Never charge for listing submission, moderation or verification.
- Never allow an applicant to verify their own listing.
- Never treat editorial approval as evidence verification.
- Never publish an unverified or incomplete record.
- Never invent or infer an address, organiser, host, date, fee, qualification or availability.
- Never expose the private queue, evidence notes, applicant contact details or participant data to public catalogue users.
- Do not bootstrap or promote a super-admin from the browser. The first super-admin must be provisioned by the trusted database operator after identity confirmation.
