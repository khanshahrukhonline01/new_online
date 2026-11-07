# KhelGrid Security Programme — Phase 6: Storage and Upload Security Architecture

> **Document ID:** SEC-P6-STOR-001  
> **Status:** Implemented in code | Tested against isolated PostgreSQL  
> **Repository:** `khelgrid-dotcom/khelgrid-platform`  
> **Database Project:** `hznsbxvovjxvmnchzzqt` (Development)  

---

## 1. Executive Summary

KhelGrid utilizes Supabase Storage (backed by S3-compatible object storage) for three primary media categories:
1. Public sports venue media (`venue-media`).
2. Public academy & sports club photos (`academy-photos`).
3. Highly sensitive, confidential athlete identity, verification, and medical documents (`cv-documents`).

This document details the security posture, RLS policies on `storage.objects`, MIME type whitelists, size quotas, and pre-signed URL architectures enforced to prevent unauthorized data exposure, malicious file execution, and storage quota exhaustion.

---

## 2. Bucket Classification & Security Matrix

| Bucket Name | Visibility | Max File Size | Permitted MIME Types | Access Pattern | Sensitivity Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `venue-media` | Public Read | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Direct CDN URL via public gateway | Low (Marketing / Venue listings) |
| `academy-photos` | Public Read | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Direct CDN URL via public gateway | Low (Academy brochures) |
| `cv-documents` | **Private** | 2 MB | `application/pdf`, `image/jpeg`, `image/png` | Short-lived signed URLs (15 min expiry) | **High / Critical** (Aadhaar, DOB, Medical) |

---

## 3. Storage Row Level Security (RLS) Policies

Supabase storage authorization is managed via PostgreSQL RLS on the `storage.objects` table.

### 3.1 Policy Definitions for `cv-documents` (Private Athlete Documents)

```sql
-- 1. Disallow any anonymous read or write
CREATE POLICY "cv_documents_deny_anon" 
ON storage.objects FOR ALL 
TO anon 
USING (false);

-- 2. Owner-only upload isolation
-- Object names are prefixed with user ID: `{user_id}/{document_type}_{random_token}.pdf`
CREATE POLICY "cv_documents_owner_insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'cv-documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text AND
    (LOWER(metadata->>'mimetype') IN ('application/pdf', 'image/jpeg', 'image/png'))
);

-- 3. Owner & Authorized Verifier Read Access
CREATE POLICY "cv_documents_authorized_read" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'cv-documents' AND (
        -- Document owner
        (storage.foldername(name))[1] = auth.uid()::text
        OR 
        -- Platform compliance/verification officer
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'compliance_officer')
        )
    )
);

-- 4. Owner-only Deletion
CREATE POLICY "cv_documents_owner_delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'cv-documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3.2 Public Buckets (`venue-media`, `academy-photos`)

```sql
-- Public Read for all users
CREATE POLICY "public_media_read" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id IN ('venue-media', 'academy-photos'));

-- Upload restricted to listing managers and administrators
CREATE POLICY "venue_media_manager_insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id IN ('venue-media', 'academy-photos') AND
    (
        EXISTS (
            SELECT 1 FROM public.venue_managers vm 
            WHERE vm.user_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'moderator')
        )
    ) AND
    (LOWER(metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/webp'))
);
```

---

## 4. Short-Lived Signed URL Strategy for Private Documents

Private athlete files stored in `cv-documents` (such as government ID cards, age verification birth certificates, or medical fitness clearances) are **never served over persistent public URLs**.

### Access Workflow:
1. Athlete or authorized academy scout requests to view a verification document.
2. The application invokes the Supabase client SDK:
   ```typescript
   const { data, error } = await supabase.storage
     .from('cv-documents')
     .createSignedUrl(`${athleteId}/dob_verification_${docId}.pdf`, 900); // 900s = 15 minutes
   ```
3. The storage service validates:
   - The requester's JWT against the RLS policies on `storage.objects`.
   - The expiration timestamp embedded in the signed HMAC token.
4. If valid, a time-limited presigned URL is returned that expires in 15 minutes.
5. Direct directory enumeration (listing all keys in `cv-documents`) is disabled.

---

## 5. Defense-in-Depth Against Malicious Uploads

1. **Strict Extension and Magic-Byte Validation**:
   - Client and server-side checks reject executable extensions (`.exe`, `.bat`, `.sh`, `.php`, `.js`, `.svg` with script injections, `.html`).
   - SVG uploads are prohibited in all buckets due to stored XSS vectors.
2. **UUID File Renaming**:
   - User-supplied filenames (`"my_passport (1).pdf"`) are discarded.
   - Files are stored with cryptographically random UUIDv4 names:
     `{user_id}/{doc_category}_{crypto.randomUUID()}.{ext}`
   - This eliminates path traversal (`../../`), null-byte injection (`file.pdf\0.php`), and overwriting collision attacks.
3. **No Direct Web Server Execution**:
   - Supabase storage files are served from isolated AWS S3 endpoints with `Content-Disposition: attachment` or forced sandboxed image content headers, preventing in-browser HTML/JS script execution.

---

## 6. Retention & Lifecycle Rules

1. **Temporary Upload Cleanup**: Uploads not linked to a completed athlete profile or venue listing within 24 hours are flagged for automated garbage collection.
2. **Account Deletion Cascade**: When an athlete invokes their DPDP right to erasure, their folder `{user_id}/` in `cv-documents` is permanently purged.
3. **Audit Trail**: Storage object deletions for compliance documents are logged in `public.security_audit_logs`.
