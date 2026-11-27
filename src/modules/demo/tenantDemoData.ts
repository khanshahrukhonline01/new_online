export type DemoDashboardId =
  | 'athlete'
  | 'coach'
  | 'academy'
  | 'venue'
  | 'tournament'
  | 'organization'
  | 'creator'
  | 'parent'
  | 'scout'

export interface DemoMetricCard {
  label: string
  value: string
  detail: string
}

export interface DemoSampleRecord {
  title: string
  meta: string
  status: string
  badge: string
}

export interface DemoDashboardSpec {
  id: DemoDashboardId
  order: number
  title: string
  shortLabel: string
  category: 'consumer' | 'partner'
  partnerRoleParam?: 'academy' | 'coach' | 'venue' | 'tournament' | 'organization'
  realWorkspacePath: string
  tagline: string
  kpis: readonly DemoMetricCard[]
  sampleHeading: string
  sampleRecords: readonly DemoSampleRecord[]
  modules: readonly { name: string; summary: string }[]
  rbacRoles: readonly { role: string; scope: string }[]
}

export const DEMO_DASHBOARDS: readonly DemoDashboardSpec[] = [
  {
    id: 'athlete',
    order: 1,
    title: 'Athlete Dashboard',
    shortLabel: 'Athlete',
    category: 'consumer',
    realWorkspacePath: '/workspace/athlete/overview',
    tagline: 'Track selection trials, verifiable Sports CV, training logs, and combine percentiles.',
    kpis: [
      { label: 'Sports CV Readiness', value: '92%', detail: 'Verified identity & match video linked' },
      { label: 'Active Trial Passes', value: '3', detail: 'Kanteerava U-19, SAI Combine, City League' },
      { label: 'Training Attendance', value: '18 / 20', detail: 'Last 30 days across registered academy' },
      { label: 'Combine Percentile', value: 'Top 8%', detail: 'Yo-Yo IR1 & 30m Sprint verified' },
    ],
    sampleHeading: 'Sample Athlete Activity & Trial Pipeline',
    sampleRecords: [
      { title: 'KSFA U-19 Open Selection Trials', meta: 'Bengaluru · Football · Sat 07:00 AM', status: 'Pass Issued', badge: 'QR Ready' },
      { title: 'Khelo India Speed & Agility Combine', meta: 'SAI Patiala Normative Battery · Verified Coach', status: 'Evaluated', badge: '88 / 100' },
      { title: 'Evening Tactical Conditioning', meta: 'Apex Sports Academy · Batch U-19 A', status: 'Present', badge: 'Attendance' },
    ],
    modules: [
      { name: 'Printable & Shareable Sports CV', summary: 'Public `/u/:handle` showcase card with verified match stats and QR.' },
      { name: 'Trial Applications & Pass Vault', summary: 'One-tap trial pass tracking, admit QR codes, and WhatsApp reminders.' },
      { name: 'Saved Venues & Pickup Games', summary: 'Track saved turfs, upcoming sessions, and weekly goal streaks.' },
    ],
    rbacRoles: [
      { role: 'athlete', scope: 'Owns personal profile, CV, trial passes, goals, and consent settings.' },
      { role: 'guardian (DPDP 2023)', scope: 'Linked parent visibility for U-18 attendance & safety alerts.' },
    ],
  },
  {
    id: 'coach',
    order: 2,
    title: 'Coach Dashboard',
    shortLabel: 'Coach',
    category: 'partner',
    partnerRoleParam: 'coach',
    realWorkspacePath: '/workspace/coach/overview',
    tagline: 'Run private 1-on-1 trainees, Khelo India SAI batteries, skill scorecards, and endorsements.',
    kpis: [
      { label: 'Active Trainees', value: '34', detail: '19 academy squad + 15 private sessions' },
      { label: 'SAI Assessments Logged', value: '62', detail: 'Sprint, Vertical Jump, Agility, Yo-Yo' },
      { label: 'Endorsements Issued', value: '14', detail: 'Verified badge on athlete Sports CVs' },
      { label: 'Pending Sessions Today', value: '4', detail: '2 field assessments, 2 video reviews' },
    ],
    sampleHeading: 'Sample Trainee Roster & Combine Evaluations',
    sampleRecords: [
      { title: 'Tanmay Saxena (U-16 Forward)', meta: '30m Sprint: 4.18s · Agility: 9.2s', status: 'Endorsed', badge: 'Top 10%' },
      { title: 'Riya Nair (U-19 Sprinter)', meta: 'Vertical Jump: 56cm · Shuttle Run Verified', status: 'Re-test Due', badge: 'Track & Field' },
      { title: 'Evening High-Performance Batch', meta: '16 trainees scheduled · Attendance QR enabled', status: 'Scheduled', badge: '17:30 IST' },
    ],
    modules: [
      { name: 'Trainee Roster & Session Tracker', summary: 'Assign drills, track attendance, and export trainee progress cards.' },
      { name: 'Khelo India SAI Assessment Battery', summary: 'Auto-compute age/gender normative percentiles against Indian standards.' },
      { name: 'Coach Endorsements & Direct UPI', summary: 'Sign verified Sports CV skill ratings and collect coaching fees directly.' },
    ],
    rbacRoles: [
      { role: 'owner / head_coach', scope: 'Full trainee roster, assessments, endorsements, and session pricing.' },
      { role: 'coach', scope: 'Scoped squad evaluations, attendance marking, and drill logs.' },
    ],
  },
  {
    id: 'academy',
    order: 3,
    title: 'Academy Dashboard',
    shortLabel: 'Academy',
    category: 'partner',
    partnerRoleParam: 'academy',
    realWorkspacePath: '/workspace/academy/overview',
    tagline: '0% commission admissions CRM, squad batches, daily roll-call, direct UPI fee ledger, and staff RBAC.',
    kpis: [
      { label: 'Enrolled Students', value: '148', detail: 'Across 6 age-group batches' },
      { label: 'Direct UPI Collections', value: '₹4.12L', detail: 'Settled 100% to academy UPI VPA (0% cut)' },
      { label: 'Admissions Leads', value: '27', detail: '9 free trials scheduled this week' },
      { label: 'Coach Staff Active', value: '8', detail: 'Head coach, coaches, front desk, accountant' },
    ],
    sampleHeading: 'Sample Academy Admissions, Batches & Fee Ledger',
    sampleRecords: [
      { title: 'U-14 Morning Cricket Batch', meta: '24/28 seats · Coach Rajesh Kumar', status: 'Attendance Open', badge: '94% Avg' },
      { title: 'Enquiry: Kabir Verma (Trial)', meta: 'Parent: Neha Verma · Badminton Beginner', status: 'Trial Scheduled', badge: 'New Lead' },
      { title: 'Receipt #INV-2026-841 (₹3,500)', meta: 'Direct UPI VPA · Monthly Tuition Settled', status: 'Paid', badge: '0% Fee' },
    ],
    modules: [
      { name: 'Admissions CRM Pipeline', summary: 'Capture free-trial enquiries and convert leads to enrolled students in 1 click.' },
      { name: 'Batch Attendance & Fee Invoices', summary: 'Daily roll-call logs, GST-ready receipts, due reminders, and CSV exports.' },
      { name: 'Multi-Role Staff Invitations', summary: 'Invite head coaches, accountants, and front desk with tenant-isolated RLS.' },
    ],
    rbacRoles: [
      { role: 'owner / director / admin', scope: 'Full admissions, fee invoices, settings, staff invites, and audit logs.' },
      { role: 'head_coach / coach', scope: 'Batches, student attendance, and training roster.' },
      { role: 'front_desk / accountant', scope: 'Enquiries check-in and fee ledger receipts (no destructive admin ops).' },
    ],
  },
  {
    id: 'venue',
    order: 4,
    title: 'Venue Management Dashboard',
    shortLabel: 'Venue / Turf',
    category: 'partner',
    partnerRoleParam: 'venue',
    realWorkspacePath: '/workspace/turf/calendar',
    tagline: 'Hourly court calendar, floodlight peak pricing, WhatsApp booking vouchers, and gate QR check-in.',
    kpis: [
      { label: 'Courts / Pitches Live', value: '6', detail: '2 Box Cricket, 2 Football 7v7, 2 Padel' },
      { label: 'Today Occupancy', value: '78%', detail: 'Prime evening slots booked (6 PM - 10 PM)' },
      { label: 'WhatsApp Vouchers', value: '19', detail: 'Auto-issued QR gate passes for verified bookings' },
      { label: 'Gate Check-Ins Today', value: '14 / 19', detail: 'Replay-protected QR arrival scanning' },
    ],
    sampleHeading: 'Sample Turf Slot Calendar & Gate Arrivals',
    sampleRecords: [
      { title: 'Turf A (7v7 FIFA Grass) · 19:00 - 20:00', meta: 'Peak Floodlight Rate ₹1,800 · Direct UPI', status: 'Confirmed', badge: 'TRF-8821' },
      { title: 'Box Cricket Bay 2 · 20:00 - 21:00', meta: 'Walk-in Team · WhatsApp Voucher Sent', status: 'Checked In', badge: 'Gate A' },
      { title: 'Turf B · 21:00 - 22:00', meta: 'Available for group booking or corporate league', status: 'Open Slot', badge: '₹1,600/hr' },
    ],
    modules: [
      { name: 'Live Hourly Grid & Peak Pricing', summary: 'Configure morning vs evening floodlight tariffs and block maintenance windows.' },
      { name: 'Gate QR Check-In & Pass Verifier', summary: 'Scan team vouchers at the gate with offline fallback and replay protection.' },
      { name: 'Recurring Club Subscriptions', summary: 'Reserve weekly fixed slots for local clubs and academy batches.' },
    ],
    rbacRoles: [
      { role: 'owner / director / listing_manager', scope: 'Venue pricing, slot rules, payouts, and partner host overview.' },
      { role: 'front_desk / staff', scope: 'Walk-in slot bookings, voucher issuance, and gate check-in scanning.' },
    ],
  },
  {
    id: 'tournament',
    order: 5,
    title: 'Tournament Management Dashboard',
    shortLabel: 'Tournament',
    category: 'partner',
    partnerRoleParam: 'tournament',
    realWorkspacePath: '/workspace/tournament/overview',
    tagline: 'Elimination brackets, anti-age-fraud birth document audit, team passes, and pitch-side live scorer.',
    kpis: [
      { label: 'Registered Teams', value: '32', detail: 'U-15 & U-17 Knockout + Group Stages' },
      { label: 'Age Audits Cleared', value: '398 / 412', detail: '14 player age docs flagged for coordinator review' },
      { label: 'Fixtures Completed', value: '18 / 31', detail: 'Auto-advancing winners across brackets' },
      { label: 'Live Scorers Active', value: '3 Pitches', detail: 'Real-time scoreboard + tiebreaker sync' },
    ],
    sampleHeading: 'Sample Tournament Brackets, Age Audit & Live Scorer',
    sampleRecords: [
      { title: 'QF-2: Apex FC vs Metro United (U-17)', meta: 'Pitch 1 · Half-time 2 - 1 · Official Scorer Live', status: 'In Progress', badge: 'Live' },
      { title: 'Squad Audit: Rising Stars XI (#Player-11)', meta: 'Birth certificate OCR mismatch flagged for check', status: 'Needs Review', badge: 'Age Guard' },
      { title: 'Team Pass #KG-TOUR-409', meta: '16 players cleared for Quarter-Final Gate Entry', status: 'Verified', badge: 'QR Pass' },
    ],
    modules: [
      { name: 'Knockout & Group Bracket Builder', summary: 'Automated seeding, ground allocation, and live bracket progression.' },
      { name: 'Anti-Age-Fraud Roster Audit', summary: 'Verify athlete eligibility documents and issue clean digital tournament passes.' },
      { name: 'Pitch-Side Live Scorekeeper', summary: 'Mobile scorer modal updating public `/live` feeds and standings.' },
    ],
    rbacRoles: [
      { role: 'owner / director', scope: 'Fixture structure, fee settings, official verification, and publish controls.' },
      { role: 'verification_coordinator', scope: 'Roster document inspection and player pass approval.' },
    ],
  },
  {
    id: 'organization',
    order: 6,
    title: 'Organisation Dashboard',
    shortLabel: 'Organisation',
    category: 'partner',
    partnerRoleParam: 'organization',
    realWorkspacePath: '/workspace/organization/overview',
    tagline: 'Manage Clubs, Schools, Universities, and State/National Federations with branches & governance RBAC.',
    kpis: [
      { label: 'Affiliated Units / Branches', value: '12', detail: 'District chapters & school campuses' },
      { label: 'Verified Members', value: '86', detail: 'Scoped by chapter, finance & verification roles' },
      { label: 'Plan Entitlement Tier', value: 'Org Free', detail: 'Zero forced upgrades; transparent usage meters' },
      { label: 'Compliance Checklist', value: '5 / 5', detail: 'POSH, DPDP 2023 & Verification policies aligned' },
    ],
    sampleHeading: 'Sample Institutional Branches & Governance Queue',
    sampleRecords: [
      { title: 'North Zone Athletics Chapter', meta: 'University Wing · 480 registered athletes', status: 'Active Branch', badge: 'Unit #04' },
      { title: 'Role Grant: verification_coordinator', meta: 'Scoped to District Eligibility Reviews only', status: 'Active RBAC', badge: 'Audited' },
      { title: 'Inter-College Selection Policy Update', meta: 'Published to public directory & athlete portal', status: 'Verified Org', badge: 'DPDP OK' },
    ],
    modules: [
      { name: 'Multi-Branch Org Units', summary: 'Structure zones, school campuses, squads, and regional sub-chapters cleanly.' },
      { name: 'Fine-Grained RBAC & Audit Logs', summary: '16 PostgreSQL organization roles completely isolated from platform admin.' },
      { name: 'Launches & Compliance Readiness', summary: 'Self-serve launch checklist, entitlements, and immutable governance log.' },
    ],
    rbacRoles: [
      { role: 'owner / org_admin / director', scope: 'Branch creation, role assignments, compliance, and org settings.' },
      { role: 'finance_manager / verification_coordinator', scope: 'Department-scoped billing meters or athlete verification.' },
    ],
  },
  {
    id: 'creator',
    order: 7,
    title: 'Creator Dashboard',
    shortLabel: 'Creator',
    category: 'consumer',
    realWorkspacePath: '/workspace/creator/overview',
    tagline: 'Run local sports sponsorship campaigns, broadcast live match overlays, and track creator payouts.',
    kpis: [
      { label: 'Active Brand Briefs', value: '4', detail: 'Local cricket & running gear campaigns' },
      { label: 'Match Stream Reach', value: '42.8K', detail: 'Combined YouTube / Reels grassroot views' },
      { label: 'Deliverables Approved', value: '9 / 10', detail: 'Tournament recap reels & scorecard graphics' },
      { label: 'Est. Campaign Earnings', value: '₹38,500', detail: 'Milestone escrow verified' },
    ],
    sampleHeading: 'Sample Sports Creator Campaigns & Match Coverage',
    sampleRecords: [
      { title: 'District T20 Knockout Highlight Package', meta: '3 Reels + 1 Live Scorecard Broadcast', status: 'In Delivery', badge: '₹15,000' },
      { title: 'Grassroots Footwear Wear-Test Campaign', meta: 'Bengaluru Marathon Runners Community', status: 'Brief Accepted', badge: 'Verified' },
      { title: 'Live Score Overlay Sync', meta: 'Connected to Tournament Pitch #1 feed', status: 'Active', badge: 'Live Feed' },
    ],
    modules: [
      { name: 'Campaign Marketplace Applications', summary: 'Pitch sports brands with verified regional audience stats and channels.' },
      { name: 'Live Match Stream Toolkit', summary: 'Link local tournament coverage directly with verified scoreboards.' },
      { name: 'Creator Profile & Deliverable Ledger', summary: 'Track approvals, brief milestones, and invoice payouts cleanly.' },
    ],
    rbacRoles: [
      { role: 'creator', scope: 'Manages creator channels, campaign proposals, deliverables, and payout ledger.' },
      { role: 'content_manager', scope: 'Org media staff collaborating on campaign assets.' },
    ],
  },
  {
    id: 'parent',
    order: 8,
    title: 'Parent Dashboard',
    shortLabel: 'Parent',
    category: 'consumer',
    realWorkspacePath: '/workspace/parent/attendance',
    tagline: 'Monitor child batch attendance, download zero-commission fee receipts, and manage DPDP youth QR passes.',
    kpis: [
      { label: 'Enrolled Child Profiles', value: '2', detail: 'U-14 Football & U-12 Badminton' },
      { label: '30-Day Attendance', value: '96%', detail: 'Real-time check-in/out alert timestamps' },
      { label: 'Fee Status', value: 'All Paid', detail: 'Next due cycle: 01 Dec (₹3,200)' },
      { label: 'Safety & Gate QR', value: 'Active', detail: 'Emergency medical tag + pickup authorization' },
    ],
    sampleHeading: 'Sample Child Attendance, Invoices & Gate Pass',
    sampleRecords: [
      { title: 'Aryan (U-14 Football) — Morning Check-In', meta: 'Marked Present at 06:42 AM · Coach Verified', status: 'Safe Arrival', badge: 'QR Scanned' },
      { title: 'Invoice #AC-1109 — November Coaching Fee', meta: '₹3,200 via Direct Academy UPI · Receipt Ready', status: 'Paid', badge: 'Download PDF' },
      { title: 'DPDP 2023 Under-18 Guardian Consent', meta: 'Authorized parent privacy & medical clearance', status: 'Granted', badge: 'Verified' },
    ],
    modules: [
      { name: 'Real-Time Attendance & Arrival Feed', summary: 'Daily check-in visibility tied directly to academy/coach roll-call.' },
      { name: 'Fee Ledger & Receipt Vault', summary: 'Track due invoices and direct UPI payment confirmation history.' },
      { name: 'Digital Ground QR Pass & Safety', summary: 'Shareable gate turnstile pass plus DPDP Act 2023 guardian consent audit.' },
    ],
    rbacRoles: [
      { role: 'parent / guardian', scope: 'Scoped strictly via guardian_user_id to their own child’s attendance, fee receipts, and QR pass.' },
    ],
  },
  {
    id: 'scout',
    order: 9,
    title: 'Scout Portal',
    shortLabel: 'Scout',
    category: 'consumer',
    realWorkspacePath: '/scout-portal',
    tagline: 'Discover combine-verified U-14 to U-23 athletes, compare percentiles, and shortlist trial standouts.',
    kpis: [
      { label: 'Scouted Combines', value: '11', detail: 'Football, Athletics, Kabaddi & Cricket' },
      { label: 'Verified Athlete CVs', value: '240+', detail: 'Includes normative test percentile bands' },
      { label: 'Shortlisted Prospects', value: '16', detail: 'Ready for academy scholarship call-ups' },
      { label: 'Age Audits Passed', value: '100%', detail: 'Verified age-band eligibility only' },
    ],
    sampleHeading: 'Sample Prospect Shortlist & Combine Metrics',
    sampleRecords: [
      { title: 'Aarav Sharma · U-19 Central Midfielder', meta: 'Bengaluru · Top 8% Yo-Yo Endurance · 92% CV', status: 'Shortlisted', badge: 'Combine #4' },
      { title: 'Meenakshi R. · U-17 400m Track', meta: 'Chennai · SAI Normative Band A · Verified Times', status: 'Call-Up Sent', badge: 'Gold Tier' },
    ],
    modules: [
      { name: 'Normative Combine Filter', summary: 'Filter athletes by age band, sport, city, and percentile thresholds.' },
      { name: 'Verified Sports CV Review', summary: 'Inspect coach endorsements, match clips, and physical test metrics.' },
    ],
    rbacRoles: [
      { role: 'scout', scope: 'Read-only scoped discovery on consented, public/trial athlete CVs.' },
    ],
  },
]
