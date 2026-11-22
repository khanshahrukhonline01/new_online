# Platform Administration vs. Organisation Administration vs. Ordinary Access

## Three Distinct Security Domains

| Domain | Scope | Examples | Current Implementation Status |
|---|---|---|---|
| **A. Platform Administration** | Platform-wide governance across KhelGrid | `super_admin`, `moderator` (expanding in Phase 2 to canonical platform roles) | Phase 1 root gate implemented; DB consolidation pending Phase 2. |
| **B. Organisation Administration** | Strictly scoped to a single organisation's own records | Organisation owner, organisation admin, manager, staff, reviewer | **Not yet wired to Admin Control Center.** Scheduled for Phase 4 after Phase 2 DB RBAC consolidation. |
| **C. Ordinary User Access** | Standard self-service public user actions | Athlete, parent, coach, scout, host, submitter | Strictly denied access to `apps/admin` by `AdminAuthGate`. |

## Non-Negotiable Separation Invariants
- Organisation administrators never automatically inherit platform administration permissions.
- Platform moderators do not receive unrestricted access to unrelated organisation-private data.
- Platform super-administrators are never represented by hardcoded frontend identities or `localStorage` keys.
