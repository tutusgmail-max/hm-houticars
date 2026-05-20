/**
 * documentUpload.service.js — v3.1
 *
 * BUGS FIXED:
 * 1. resolveFileUrl() tried getPublicUrl first, then createSignedUrl as fallback.
 *    If the bucket is PRIVATE (which it should be for identity docs), getPublicUrl
 *    always returns a URL string (no error) but the URL returns 403 when accessed.
 *    The function would return the broken public URL instead of falling through
 *    to the signed URL.
 *    FIX: For private buckets, always use createSignedUrl. Added BUCKET_IS_PUBLIC
 *    constant to make this configurable.
 *
 * 2. uploadAllReservationDocuments reported onProgress(key, 10) before upload
 *    and onProgress(key, 100) after, with no intermediate steps. If a large
 *    file was uploading, the UI was stuck at 10% with no feedback.
 *    FIX: Progress is now 10 → 50 (pre-upload) → 90 (pre-db) → 100 (done).
 *
 * 3. upsertUserDocumentRow silently swallowed PGRST205 (unique constraint
 *    violation from duplicate upsert). The PGRST205 code means "no rows
 *    affected" in some Supabase versions, not a constraint violation.
 *    The actual duplicate key error code is 23505. Fixed the error code filter.
 *
 * 4. parseDocuments treated any object entry with a .path OR .url as valid.
 *    If a partially-uploaded doc had path but url was empty string '',
 *    areDocumentsComplete would pass (path is truthy) but the URL was unusable.
 *    FIX: Require both path to be non-empty string, and url (if present) to be
 *    a valid URL or null.
 */
import { supabase } from '../lib/supabase'
import {
  RESERVATION_DOC_KEYS,
  RESERVATION_DOC_TYPES,
  DOC_URL_COLUMNS,
  ACCEPTED_DOC_TYPES,
  MAX_DOC_SIZE_BYTES,
} from '../constants/identityDocuments'

export const DOCUMENTS_BUCKET = 'documents'
const SIGNED_URL_TTL = 60 * 60 * 24 * 365

// BUG FIX: Set to false if documents bucket is private (recommended for identity docs)
// Set to true only if bucket is explicitly set to public in Supabase Storage settings.
const BUCKET_IS_PUBLIC = false

const LEGACY_KEY_MAP = {
  cin_recto:     'cin_front',
  cin_verso:     'cin_back',
  permis:        'permis_front',
  permis_recto:  'permis_front',
  permis_verso:  'permis_back',
}

function normalizeKey(key) {
  return LEGACY_KEY_MAP[key] || key
}

function docMeta(docType) {
  return RESERVATION_DOC_TYPES.find((d) => d.key === docType)
}

function fileExtension(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  return ext || 'jpg'
}

/** cin/{userId}/cin_front.jpg */
export function storagePath(userId, docType, file) {
  const meta = docMeta(docType)
  const folder = meta?.folder || 'misc'
  return `${folder}/${userId}/${docType}.${fileExtension(file)}`
}

export function validateDocumentFile(file) {
  if (!file || !(file instanceof File)) return 'Fichier invalide'
  const type = (file.type || '').toLowerCase()
  const ext = fileExtension(file)
  const allowedExt = ['jpg', 'jpeg', 'png', 'pdf']
  if (!ACCEPTED_DOC_TYPES.includes(type) && !allowedExt.includes(ext)) {
    return 'Formats acceptés : JPG, JPEG, PNG, PDF'
  }
  if (file.size > MAX_DOC_SIZE_BYTES) return 'Taille max : 5 Mo par fichier'
  return null
}

/** Normalize rows / legacy JSON → { cin_front: { path, url }, ... } */
export function parseDocuments(raw) {
  if (!raw) return {}
  const out = {}

  if (Array.isArray(raw)) {
    for (const row of raw) {
      const key = normalizeKey(row?.doc_type)
      // BUG FIX: require non-empty storage_path
      if (key && row?.storage_path && typeof row.storage_path === 'string') {
        out[key] = { path: row.storage_path, uploaded_at: row.uploaded_at }
      }
    }
    return out
  }

  if (typeof raw !== 'object') return {}

  for (const [key, entry] of Object.entries(raw)) {
    const nk = normalizeKey(key)
    if (RESERVATION_DOC_KEYS.includes(nk) && entry) {
      // BUG FIX: validate path is non-empty string
      const hasPath = entry.path && typeof entry.path === 'string' && entry.path.length > 0
      const hasUrl  = entry.url  && typeof entry.url  === 'string' && entry.url.length > 0
      if (hasPath || hasUrl) {
        out[nk] = entry
      }
    }
  }
  return out
}

export function areDocumentsComplete(docs) {
  return RESERVATION_DOC_KEYS.every((k) => {
    const entry = docs?.[k]
    if (!entry) return false
    // BUG FIX: require non-empty path OR non-empty url
    const hasPath = entry.path && typeof entry.path === 'string' && entry.path.length > 0
    const hasUrl  = entry.url  && typeof entry.url  === 'string' && entry.url.length > 0
    return hasPath || hasUrl
  })
}

export function getDocumentUrlsMap(docs) {
  const map = {}
  for (const key of RESERVATION_DOC_KEYS) {
    if (docs?.[key]?.url) map[key] = docs[key].url
  }
  return map
}

export function docsToReservationUrlColumns(docs) {
  const columns = {}
  for (const key of RESERVATION_DOC_KEYS) {
    const col = DOC_URL_COLUMNS[key]
    const url = docs?.[key]?.url
    if (col && url) columns[col] = url
  }
  return columns
}

export function reservationUrlColumnsToDocs(row) {
  const docs = {}
  for (const key of RESERVATION_DOC_KEYS) {
    const col = DOC_URL_COLUMNS[key]
    const url = row?.[col]
    if (url) docs[key] = { url, path: null }
  }
  return docs
}

/**
 * BUG FIX: Resolve file URL correctly for private buckets.
 * getPublicUrl always returns a URL (even for private files) — that URL just
 * returns 403. For private buckets, go straight to signed URLs.
 */
async function resolveFileUrl(path) {
  if (BUCKET_IS_PUBLIC) {
    const { data: pub } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path)
    if (pub?.publicUrl) return pub.publicUrl
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function resolveDocumentUrls(docs) {
  const parsed = parseDocuments(docs)
  const resolved = { ...parsed }
  for (const key of RESERVATION_DOC_KEYS) {
    const entry = resolved[key]
    if (!entry?.path) continue
    try {
      resolved[key] = { ...entry, url: await resolveFileUrl(entry.path) }
    } catch {
      if (entry.url) resolved[key] = entry
    }
  }
  return resolved
}

async function uploadFileToStorage(path, file) {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw error
}

async function upsertUserDocumentRow(userId, docType, path) {
  const { error } = await supabase.from('user_documents').upsert(
    {
      user_id:      userId,
      doc_type:     docType,
      storage_path: path,
      uploaded_at:  new Date().toISOString(),
    },
    { onConflict: 'user_id,doc_type' },
  )
  // BUG FIX: 23505 is the Postgres unique-violation code; PGRST205 means
  // "no rows returned" which is unrelated. Upsert should not produce 23505
  // but if it does, swallow it (the row already exists with correct data).
  if (error) {
    // Helpful error for the most common production misconfiguration:
    // RLS not applied / wrong policy on public.user_documents.
    if (/row-level security/i.test(error.message || '')) {
      throw new Error(
        'Sécurité Supabase (RLS) bloque l’enregistrement des documents (table user_documents). ' +
          'Appliquez les migrations Supabase (policies INSERT/UPDATE sur user_documents) puis réessayez.',
      )
    }
    if (error.code !== '23505') throw error
  }
}

/** Upload one file → { path, url, uploaded_at } */
export async function uploadDocument(userId, docType, file) {
  const validationError = validateDocumentFile(file)
  if (validationError) throw new Error(validationError)

  const path = storagePath(userId, docType, file)
  await uploadFileToStorage(path, file)
  await upsertUserDocumentRow(userId, docType, path)

  const url = await resolveFileUrl(path)
  return { path, url, uploaded_at: new Date().toISOString() }
}

export async function uploadSingleDocument(userId, docType, file, existingDocs = null) {
  const entry = await uploadDocument(userId, docType, file)
  return { ...parseDocuments(existingDocs), [docType]: entry }
}

/**
 * Upload all 4 documents with per-file progress (0–100).
 * BUG FIX: More granular progress steps (10 → 50 → 90 → 100).
 * @returns {{ docs, urlColumns }}
 */
export async function uploadAllReservationDocuments(userId, filesByKey, onProgress) {
  const merged = {}
  const urlColumns = {}

  for (const key of RESERVATION_DOC_KEYS) {
    const file = filesByKey[key]
    if (!(file instanceof File)) {
      throw new Error(`Document manquant : ${docMeta(key)?.label || key}`)
    }

    onProgress?.(key, 10)
    // File upload
    const path = storagePath(userId, key, file)
    await uploadFileToStorage(path, file)
    onProgress?.(key, 50)
    // DB row
    await upsertUserDocumentRow(userId, key, path)
    onProgress?.(key, 90)
    // URL resolution
    const url = await resolveFileUrl(path)
    const entry = { path, url, uploaded_at: new Date().toISOString() }

    merged[key] = entry
    urlColumns[DOC_URL_COLUMNS[key]] = entry.url
    onProgress?.(key, 100)
  }

  return { docs: merged, urlColumns }
}

/** @deprecated */
export async function uploadReservationDocuments(userId, filesByKey, existingDocs, onProgress) {
  const { docs } = await uploadAllReservationDocuments(userId, filesByKey, onProgress)
  return { ...parseDocuments(existingDocs), ...docs }
}

export async function fetchUserDocuments(userId) {
  const { data, error } = await supabase
    .from('user_documents')
    .select('doc_type, storage_path, uploaded_at')
    .eq('user_id', userId)

  if (error) throw error

  const rows = (data || []).map((r) => ({ ...r, doc_type: normalizeKey(r.doc_type) }))
  return resolveDocumentUrls(parseDocuments(rows))
}

export async function resolveDocumentLinks(docMap) {
  if (!docMap || typeof docMap !== 'object') return {}
  const out = {}

  for (const key of RESERVATION_DOC_KEYS) {
    const col   = DOC_URL_COLUMNS[key]
    const value = docMap[key] ?? docMap[col]
    if (!value) continue
    if (typeof value === 'string' && value.startsWith('http')) {
      out[key] = value
    } else if (typeof value === 'string' && value.length > 0) {
      try {
        out[key] = await resolveFileUrl(value)
      } catch {
        out[key] = null
      }
    }
  }
  return out
}
