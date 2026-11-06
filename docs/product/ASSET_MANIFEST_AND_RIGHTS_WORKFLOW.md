# KhelGrid Asset Manifest and Rights Workflow

**Status:** Audit baseline; rights not yet verified  
**Branch:** `docs/asset-manifest-and-rights-workflow`  
**Scope:** Local files under `public/assets/` and external image URLs found in homepage/banner/Supabase client source files.  
**Rule:** Presence in the repository or a public URL does not prove ownership, permission, or production approval.

## Inventory

The accompanying `ASSET_MANIFEST.csv` records each local asset and each unique external image URL found in:
- `src/modules/home/HomePage.tsx`
- `src/modules/home/homeSvgBanners.ts`
- `src/integrations/supabase/public-client.ts`

The manifest includes file path/URL, type, format, size where available, usage/source reference, provenance, rights status, production status, and repository blob SHA for local files.

## Rights and approval states

- **Pending rights review:** source/creator, applicable license or permission, commercial-use rights, attribution, modification rights, territory, term and any restrictions have not been verified.
- **Approved:** documented evidence has been reviewed and the intended use is within its terms.
- **Rejected/expired:** do not ship; replace or remove from active use after checking dependencies.
- **AI-generated — pending review:** record service/model, generation date, account/terms version, prompt, output identifier, human edits, and any required disclosure. This is not automatically equivalent to exclusive copyright ownership.
- **Owned/commissioned:** retain source files, creator agreement/assignment, invoices or employment/commission records, and written transfer/licence terms as applicable.

No item in the initial audit should be promoted to Approved solely because it is stored locally or served by a public CDN.

## How to add KhelGrid-created images

1. Create or commission the image without using third-party logos, identifiable athletes, copyrighted characters, or copied reference photographs unless permission exists.
2. Save an optimized delivery image under a descriptive path, for example `public/assets/hero/football-stadium.webp`. Keep editable/source masters separately when practical.
3. Record the source, creator, date, tool/model (if AI), generation prompt/reference IDs, human edits, terms version, rights evidence, attribution requirements and intended use in the manifest.
4. Have a human reviewer check visual accuracy, trademarks, likeness/publicity/privacy concerns, artifacts, accessibility/alt text, and rights evidence.
5. Mark `production_status=approved` only after review. Otherwise keep `pending`.
6. Reference the local path from the relevant component, test desktop/mobile crops, loading, fallback, reduced motion and performance, then open a PR.

## AI generation and ownership

AI can help produce bespoke KhelGrid visuals and reduce dependence on stock-photo URLs. It does **not** guarantee that the output is copyrightable, exclusive, non-infringing, or “100% owned” under every jurisdiction. Before commercial deployment:
- Check the generation service's terms applicable on the generation date and account type.
- Avoid prompts that imitate named living artists, brands, teams, athletes, photographs, or protected visual properties.
- Prefer fictional, non-identifiable athletes and generic venues.
- Preserve prompts, output identifiers, original files and human-edit history.
- Add substantial human creative direction/editing where appropriate and document it.
- Obtain legal review for high-value brand/marketing assets and any claim of exclusive ownership.

Recommended metadata fields for future entries: `creator`, `created_at`, `source_tool`, `model_version`, `prompt`, `output_id`, `human_edits`, `terms_url`, `terms_version`, `rights_evidence`, `attribution`, `territory`, `expiry`, `reviewer`, `reviewed_at`.

## Initial audit limitations

- External URL discovery is source-code based and scoped to the three files listed above; further repository-wide scanning may reveal additional URLs.
- A URL appearing in source does not prove the remote image currently loads or depicts the stated subject.
- Binary assets are inventoried by repository tree metadata and SHA; their visual contents were not individually inspected in this pass.
- Licensing and ownership cannot be established from file metadata alone.

## Release gate

No unverified asset may be described as exclusively owned by KhelGrid or approved for production. Replace unverified external imagery with documented original/commissioned assets or properly licensed alternatives after the manifest review.


## User-supplied Gemini hero images (2026-11-02)

Two PNG source images were supplied by the user and converted to WebP delivery files for the homepage hero:
- `public/assets/hero/cricket-stadium.webp` — 1365 × 768, 146,666 bytes.
- `public/assets/hero/football-stadium.webp` — 1365 × 768, 208,986 bytes.

The manifest records Gemini AI as the user-reported source and the conversion date. The generation prompt, exact model/version, account terms applicable on generation date, and any legal ownership evidence were not supplied or independently verified. Keep both entries pending rights review; do not describe them as exclusively owned or production-approved until those checks are complete. Preserve the original PNGs as source masters.
