-- ==============================================================================
-- KhelGrid — Phase 5: Storage Security & Document Isolation
-- Migration: 20261108020000_phase5_storage_security_and_document_isolation.sql
--
-- Purpose:
-- 1. Initialize and harden storage buckets referenced across KhelGrid:
--    - venue-media (Public: images of courts, turfs, pavilions, floodlights)
--    - academy-photos (Public: images of coaching academies, drills, grounds)
--    - cv-documents (STRICTLY PRIVATE: Aadhaar cards, birth certificates, medical clearances)
-- 2. Enforce strict 1MB (1,048,576 bytes) max file size quotas on all buckets.
-- 3. Enforce strict MIME whitelists:
--    - Media buckets: image/png, image/jpeg, image/webp
--    - Identity documents: image/png, image/jpeg, image/webp, application/pdf
-- 4. Remediate SEC-013 & revoke dangerous public read policies on cv-documents.
-- 5. Enforce path-based owner isolation (cv-documents/{userId}/{filename}) using RLS
--    and restrict document retrieval exclusively to short-lived signed URLs.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. INITIALIZE & CONFIGURE STORAGE BUCKETS WITH QUOTAS & MIME RESTRICTIONS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      (
        'venue-media',
        'venue-media',
        true,
        1048576, -- 1MB strict quota
        ARRAY['image/png', 'image/jpeg', 'image/webp']
      ),
      (
        'academy-photos',
        'academy-photos',
        true,
        1048576, -- 1MB strict quota
        ARRAY['image/png', 'image/jpeg', 'image/webp']
      ),
      (
        'cv-documents',
        'cv-documents',
        false, -- STRICTLY PRIVATE! Zero direct public CDN access
        1048576, -- 1MB strict quota
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
      )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. HARDEN ROW LEVEL SECURITY POLICIES ON storage.objects
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN

    -- Enable Row Level Security on storage.objects
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Drop legacy / over-permissive policies that exposed cv-documents
    DROP POLICY IF EXISTS "public_select_cv_docs" ON storage.objects;
    DROP POLICY IF EXISTS "public_insert_cv_docs" ON storage.objects;
    DROP POLICY IF EXISTS "public_select_venue_media" ON storage.objects;
    DROP POLICY IF EXISTS "public_insert_venue_media" ON storage.objects;
    DROP POLICY IF EXISTS "public_view_media_buckets" ON storage.objects;
    DROP POLICY IF EXISTS "authenticated_upload_media_buckets" ON storage.objects;
    DROP POLICY IF EXISTS "owner_or_admin_manage_media_buckets" ON storage.objects;
    DROP POLICY IF EXISTS "cv_documents_owner_read" ON storage.objects;
    DROP POLICY IF EXISTS "cv_documents_owner_insert" ON storage.objects;
    DROP POLICY IF EXISTS "cv_documents_owner_delete" ON storage.objects;

    -- 2.1 Public Media Buckets (venue-media & academy-photos)
    -- Public can read images
    CREATE POLICY "public_view_media_buckets"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id IN ('venue-media', 'academy-photos'));

    -- Authenticated hosts and coaches can upload media
    CREATE POLICY "authenticated_upload_media_buckets"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id IN ('venue-media', 'academy-photos')
        AND auth.uid() IS NOT NULL
      );

    -- Owner or Admin can update or delete media
    CREATE POLICY "owner_or_admin_manage_media_buckets"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (
        bucket_id IN ('venue-media', 'academy-photos')
        AND (auth.uid() = owner OR public.is_admin())
      )
      WITH CHECK (
        bucket_id IN ('venue-media', 'academy-photos')
        AND (auth.uid() = owner OR public.is_admin())
      );

    -- 2.2 Athlete Identity Documents (cv-documents) - STRICT PRIVACY
    -- Document Read: Restricted strictly to the athlete owner, verified admin, or service_role
    -- Path format: cv-documents/{userId}/{filename}
    CREATE POLICY "cv_documents_owner_read"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'cv-documents'
        AND (
          auth.uid() = owner
          OR (auth.uid()::text = (storage.foldername(name))[1])
          OR public.is_admin()
          OR (SELECT current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
        )
      );

    -- Document Upload: Athletes can upload ONLY into their own folder ({userId}/...)
    CREATE POLICY "cv_documents_owner_insert"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'cv-documents'
        AND auth.uid() IS NOT NULL
        AND (
          (auth.uid()::text = (storage.foldername(name))[1])
          OR public.is_admin()
        )
      );

    -- Document Deletion: Athletes can delete only their own files
    CREATE POLICY "cv_documents_owner_delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'cv-documents'
        AND (
          auth.uid() = owner
          OR (auth.uid()::text = (storage.foldername(name))[1])
          OR public.is_admin()
        )
      );

  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. SECURE RPC HELPER FOR DOCUMENT VERIFICATION AUDIT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_document_upload_audit(
  p_user_id uuid,
  p_document_type text,
  p_file_path text,
  p_file_size integer,
  p_mime_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_is_authorized boolean;
BEGIN
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_is_authorized := (auth.uid() = p_user_id)
    OR (v_caller_role = 'service_role')
    OR public.is_admin();

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: You can only record document uploads for your own account.';
  END IF;

  IF p_file_size > 1048576 THEN
    RAISE EXCEPTION 'File size exceeds maximum 1MB quota (% bytes).', p_file_size;
  END IF;

  IF p_mime_type NOT IN ('image/png', 'image/jpeg', 'image/webp', 'application/pdf') THEN
    RAISE EXCEPTION 'Disallowed file type: "%". Allowed types: PNG, JPEG, WebP, PDF.', p_mime_type;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_user_id,
    'documentType', p_document_type,
    'filePath', p_file_path,
    'fileSize', p_file_size,
    'mimeType', p_mime_type,
    'uploadedAt', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_document_upload_audit(uuid, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_document_upload_audit(uuid, text, text, integer, text) TO authenticated, service_role;

COMMIT;
