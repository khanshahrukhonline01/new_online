# Moderation access and publication SOP

## Current implementation

- Public visitors can INSERT listing suggestions into `public.listing_submissions` using only the approved submission columns.
- Public visitors cannot SELECT, UPDATE, or DELETE queue records.
- Moderation access is exposed only through `get_listing_submissions()` and `review_listing_submission(uuid,text,text)`, which require an authenticated user whose UUID is active in `public.listing_moderators`.
- The allowlist table has RLS enabled and no public/authenticated table grants. Only trusted database operators using the Supabase Dashboard/service role should manage allowlist rows.
- A moderator decision changes the intake status and review metadata only. It does not publish a catalogue record. Publishing must remain a separate verified step.

## Enable a moderator safely

Authentication is paused for general KhelGrid users. Do not enable public sign-up merely to make moderation work.

1. An authorized project owner creates or invites the moderator account using the Supabase Dashboard and verifies the person out-of-band.
2. Retrieve the exact UUID from Authentication > Users.
3. A trusted database operator inserts that UUID into the allowlist. Example SQL, to be run only after replacing the placeholder with the verified UUID:

```sql
insert into public.listing_moderators (user_id, is_active)
values ('00000000-0000-0000-0000-000000000000', true)
on conflict (user_id) do update set is_active = true;
```

4. Deactivate access immediately when it is no longer needed:

```sql
update public.listing_moderators set is_active = false
where user_id = '00000000-0000-0000-0000-000000000000';
```

Never expose a service-role key in the browser, Vite environment variables, source control, logs, or messages.

## Review a submission

1. Inspect the official HTTPS source manually. Do not automatically fetch arbitrary user-submitted URLs.
2. Check the organiser, dates, eligibility, fees, location, and whether the listing is current. Avoid unnecessary personal data.
3. Call the authenticated `get_listing_submissions()` RPC from an approved moderator session.
4. Call `review_listing_submission` with the submission UUID and either `approved` or `rejected`, plus optional concise notes.
5. Review RPC calls are restricted to active allowlisted users. Re-review of an already reviewed record is rejected.
6. An approved intake submission is **not yet a public catalogue listing**. A separate publication process must map fields into the correct catalogue table and set publication status only after verifying all required fields and source evidence.

## Release checks

- Keep login and public signup paused unless separately approved.
- Test the RPCs with a non-allowlisted authenticated account (must fail) and an allowlisted account (must succeed).
- Test anonymous calls to both RPCs (must fail).
- Test approved/rejected transitions, repeated review attempts, malformed IDs, and notes length.
- Run GitHub Actions, review the Vercel preview, and inspect Supabase security advisors before merging.
- Apply database changes using timestamped, transaction-wrapped SQL migrations tracked in the repository.
