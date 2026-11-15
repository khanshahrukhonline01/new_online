# KhelChronicle Editorial Moderation & Peer Review Standard Operating Procedure (SOP)

- **Platform**: KhelChronicle / SportRxiv India
- **Responsible Entity**: KhelChronicle Editorial Board & Moderation Desk
- **Document Version**: 2.0.0
- **Moderation SLA**: 48 to 72 hours from intake deposit
- **Governance**: Aligned with Committee on Publication Ethics (COPE) & STORK Guidelines

---

## 1. Moderation Purpose and Nature

KhelChronicle is a pre-moderated preprint repository. It does not conduct full, slow double-blind peer review prior to posting. Instead, it conducts a rigorous **Two-Tier Pre-Moderation Screening** to protect the integrity of the scientific literature, ensure participant safety, and prevent harmful pseudoscience or commercial spam from entering the public record.

---

## 2. Two-Tier Screening Protocol

Each manuscript submitted via `/khelchronicle/submit` enters the private moderation queue in Supabase (`chronicle_manuscripts`) with status `pending_review`.

### Tier 1: Automated Screening Checks
1. **File Format & Text Extraction**: Verify PDF file readability, minimal length (> 1,000 words), and absence of malware or corrupted binary chunks.
2. **Plagiarism & Duplication Check**: Automated scanning against existing Crossref literature and preprint repositories for verbatim uncredited text duplication (> 20% similarity flag).
3. **AI Text Disclosure Check**: Check for mandatory disclosures if generative AI tools were utilized during manuscript drafting or coding analysis.

### Tier 2: Editorial Moderator Inspection (Human Expert)
An assigned editorial moderator conducts manual verification against four standard criteria:

1. **Scientific Scope**:
   * Does the manuscript address sports science, biomechanics, exercise physiology, sports medicine, sports psychology, or athletic development?
   * *Decline*: Commercial whitepapers, personal coaching advertisements, pure opinion blogs, and non-scholarly claims.
2. **Author Legitimacy & Institutional Affiliation**:
   * Are authors identifiable researchers, sports scientists, coaches, or clinicians with verified institutional affiliations and ORCID records?
3. **Participant Ethics & Minor Protection**:
   * Is an Institutional Ethics Committee (IEC/IRB) approval number documented?
   * For studies testing minors under 18 years, is parental/guardian informed consent explicitly declared?
   * Does the protocol present unacceptable physical risk or medical hazards?
4. **Research Statements & Primary Data**:
   * Are Data Availability, Funding, and Conflict of Interest statements present and non-empty?

---

## 3. Moderator Actions & Database Status Transitions

Moderators interact via the Admin Moderation Desk (`/admin` or `/chronicle/moderation`):

| Action | Next State | Author Notification & Workflow |
|---|---|---|
| **Claim Review** | `under_review` | Assigns editorial moderator name and timestamp. |
| **Request Corrections** | `changes_requested` | Issues structured feedback message to the author requesting missing ethics clearance, data links, or formatting fixes. |
| **Approve Manuscript** | `approved` | Marks manuscript ready for formal accession minting. |
| **Reject Submission** | `rejected` | Declines manuscript with explicit reasons (out of scope, ethical violation, unverified authorship). |
| **Publish to Archive** | `published` | Generates accession identifier (`KG-2026-XXX`), mints persistent Crossref DOI, creates permanent slug, and publishes manuscript to the live public repository. |

---

## 4. Community Peer Review & Comment Moderation SOP

1. **Database Comment Ingestion**:
   * Reader comments and formal peer reviews submitted on `/khelchronicle/:slug` are stored in `chronicle_paper_comments`.
   * Real-time validation requires: Author Name ($\ge 2$ chars), Affiliation ($\ge 2$ chars), Content ($\ge 10$ chars), and Comment Type classification (`peer_review`, `methodological_query`, `replication_note`, `general`).
2. **Moderation Flags**:
   * Comments containing profane language, harassment, ungrounded accusations, or commercial sales links are automatically quarantined for review.
   * Legitimate constructive criticism, statistical queries, and replication caveats must remain published regardless of whether they praise or challenge the paper's conclusions.
3. **Author Response Rights**:
   * Authors of the preprint can reply directly to peer reviews. Their replies receive an official green `Author Response` badge to ensure transparent, balanced scholarly dialogue.
