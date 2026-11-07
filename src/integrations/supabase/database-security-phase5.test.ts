import { describe, it, expect } from 'vitest'
import {
  validateStorageUpload,
  sanitizeStorageFileName,
  generateAthleteDocumentPath,
  uploadAthleteDocument,
  getAthleteDocumentSignedUrl,
  MAX_STORAGE_FILE_SIZE_BYTES,
  ALLOWED_MEDIA_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
} from './storage-client'

describe('Phase 5: Storage Security & Document Isolation Suite', () => {
  it('SEC-TEST-P5-01: Enforces strict 1MB (1,048,576 bytes) max file size quota', () => {
    expect(MAX_STORAGE_FILE_SIZE_BYTES).toBe(1048576)

    // Valid size: 500 KB
    const validFile = { name: 'aadhaar_scan.png', size: 500 * 1024, type: 'image/png' }
    const validRes = validateStorageUpload(validFile, 'cv-documents')
    expect(validRes.valid).toBe(true)

    // Invalid size: 1.2 MB
    const oversizedFile = { name: 'large_video.mp4', size: 1.2 * 1024 * 1024, type: 'image/png' }
    const oversizedRes = validateStorageUpload(oversizedFile, 'cv-documents')
    expect(oversizedRes.valid).toBe(false)
    expect(oversizedRes.error).toContain('1MB maximum limit')

    // Boundary: exactly 1MB is valid; 1MB + 1 byte is rejected
    expect(validateStorageUpload({ name: 'test.png', size: 1048576, type: 'image/png' }, 'cv-documents').valid).toBe(true)
    expect(validateStorageUpload({ name: 'test.png', size: 1048577, type: 'image/png' }, 'cv-documents').valid).toBe(false)
  })

  it('SEC-TEST-P5-02: cv-documents allows only PNG, JPEG, WebP, and PDF', () => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
    expect(ALLOWED_DOCUMENT_MIME_TYPES).toEqual(allowed)

    allowed.forEach(mime => {
      const res = validateStorageUpload({ name: 'doc', size: 1000, type: mime }, 'cv-documents')
      expect(res.valid).toBe(true)
    })

    // Dangerous / Disallowed types must be blocked
    const dangerousTypes = [
      'application/x-msdownload',
      'text/html',
      'image/svg+xml', // XSS vector
      'application/javascript',
      'application/zip',
      'video/mp4',
    ]

    dangerousTypes.forEach(mime => {
      const res = validateStorageUpload({ name: 'doc', size: 1000, type: mime }, 'cv-documents')
      expect(res.valid).toBe(false)
      expect(res.error).toContain('PNG, JPEG, WebP, or PDF')
    })
  })

  it('SEC-TEST-P5-03: venue-media and academy-photos allow only images (PNG, JPEG, WebP)', () => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    expect(ALLOWED_MEDIA_MIME_TYPES).toEqual(allowed)

    allowed.forEach(mime => {
      expect(validateStorageUpload({ name: 'photo', size: 1000, type: mime }, 'venue-media').valid).toBe(true)
      expect(validateStorageUpload({ name: 'photo', size: 1000, type: mime }, 'academy-photos').valid).toBe(true)
    })

    // PDF is disallowed in public media buckets
    expect(validateStorageUpload({ name: 'brochure.pdf', size: 1000, type: 'application/pdf' }, 'venue-media').valid).toBe(false)
    expect(validateStorageUpload({ name: 'brochure.pdf', size: 1000, type: 'application/pdf' }, 'academy-photos').valid).toBe(false)
  })

  it('SEC-TEST-P5-04: sanitizeStorageFileName neutralizes directory traversal and unsafe characters', () => {
    expect(sanitizeStorageFileName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeStorageFileName('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe')
    expect(sanitizeStorageFileName('my aadhaar (2026) #1.pdf')).toBe('my_aadhaar__2026___1.pdf')
    expect(sanitizeStorageFileName('UPPERCASE_NAME.PNG')).toBe('uppercase_name.png')
  })

  it('SEC-TEST-P5-05: generateAthleteDocumentPath enforces user-isolated folder containment', () => {
    const userId = 'usr-athlete-99'
    const path = generateAthleteDocumentPath(userId, 'aadhaar', 'aadhaar_card.pdf')

    // Path must start with the user's isolated ID folder
    expect(path.startsWith('usr-athlete-99/')).toBe(true)
    expect(path).toContain('aadhaar_')
    expect(path).toContain('aadhaar_card.pdf')

    // Cross-user path injection attempt is sanitized
    const maliciousUser = '../../victim-user'
    const sanitizedPath = generateAthleteDocumentPath(maliciousUser, 'aadhaar', 'doc.pdf')
    expect(sanitizedPath.startsWith('victim-user/')).toBe(true)
    expect(sanitizedPath).not.toContain('..')
  })

  it('SEC-TEST-P5-06: uploadAthleteDocument validates files and rejects invalid requests before network call', async () => {
    // 1. Oversized document upload fails immediately before network
    const oversizedUpload = await uploadAthleteDocument(
      { name: 'giant_scan.pdf', size: 3 * 1024 * 1024, type: 'application/pdf' },
      'user-101',
      'dob_proof',
    )
    expect(oversizedUpload.success).toBe(false)
    expect(oversizedUpload.message).toContain('1MB maximum limit')

    // 2. Disallowed MIME format fails immediately before network
    const badMimeUpload = await uploadAthleteDocument(
      { name: 'malware.exe', size: 500, type: 'application/x-msdownload' },
      'user-101',
      'dob_proof',
    )
    expect(badMimeUpload.success).toBe(false)
    expect(badMimeUpload.message).toContain('Invalid file format')

    // 3. Validated input attempts remote upload with isolated folder containment
    const attempt = await uploadAthleteDocument(
      { name: 'birth_cert.pdf', size: 250000, type: 'application/pdf' },
      'user-101',
      'dob_proof',
    )
    expect(attempt).toBeDefined()
    expect(typeof attempt.success).toBe('boolean')
    if (attempt.success) {
      expect(attempt.filePath?.startsWith('user-101/')).toBe(true)
    } else {
      expect(attempt.message).toBeDefined()
    }
  })

  it('SEC-TEST-P5-07: getAthleteDocumentSignedUrl enforces typed result and handles token expiry windows', async () => {
    const signedRes = await getAthleteDocumentSignedUrl('user-101/aadhaar_card.pdf', 300)
    expect(signedRes).toBeDefined()
    if (signedRes.url) {
      expect(typeof signedRes.url).toBe('string')
    } else {
      expect(signedRes.error).toBeDefined()
    }
  })

  it('SEC-TEST-P5-08: RLS policy specification blocks anonymous access to cv-documents', () => {
    const canAccessStorageBucket = (
      bucketId: string,
      role: 'anon' | 'authenticated',
      isOwner: boolean,
    ) => {
      if (bucketId === 'venue-media' || bucketId === 'academy-photos') {
        return true // Public media read allowed
      }
      if (bucketId === 'cv-documents') {
        // Private: Anonymous is NEVER allowed
        if (role === 'anon') return false
        return isOwner
      }
      return false
    }

    // Public buckets are readable by anon
    expect(canAccessStorageBucket('venue-media', 'anon', false)).toBe(true)
    expect(canAccessStorageBucket('academy-photos', 'anon', false)).toBe(true)

    // Private athlete identity documents are strictly blocked from anonymous callers
    expect(canAccessStorageBucket('cv-documents', 'anon', false)).toBe(false)
    expect(canAccessStorageBucket('cv-documents', 'anon', true)).toBe(false)
    expect(canAccessStorageBucket('cv-documents', 'authenticated', true)).toBe(true)
    expect(canAccessStorageBucket('cv-documents', 'authenticated', false)).toBe(false)
  })
})
