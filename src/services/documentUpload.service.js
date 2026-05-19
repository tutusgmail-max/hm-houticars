/**
 * documentUpload.service.js — CIN + permis (4 sides) → bucket "documents"
 * Paths: cin/{userId}/cin_front.ext | permis/{userId}/permis_front.ext
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

const LEGACY_KEY_MAP = {
  cin_recto: 'cin_front',
  cin_verso: 'cin_back',
  permis: 'permis_front',
  permis_recto: 'permis_front',
  permis_verso: 'permis_back',
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
  if (!file || !(file instanceof File)) {
    return 'Fichier invalide'
  }
  const type = (file.type || '').toLowerCase()
  const ext = fileExtension(file)
  const allowedExt = ['jpg', 'jpeg', 'png', 'pdf']
  if (!ACCEPTED_DOC_TYPES.includes(type) && !allowedExt.includes(ext)) {
    return 'Formats acceptés : JPG, JPEG, PNG, PDF'
  }
  if (file.size > MAX_DOC_SIZE_BYTES) {
    return 'Taille max : 5 Mo par fichier'
  }
  return null
}

/** Normalize rows / legacy JSON → { cin_front: { path, url }, ... } */
export function parseDocuments(raw) {
  if (!raw) return {}
  const out = {}

  if (Array.isArray(raw)) {
    for (const row of raw) {
      const key = normalizeKey(row?.doc_type)
      if (key && row?.storage_path) {
        out[key] = { path: row.storage_path, uploaded_at: row.uploaded_at }
      }
    }
    return out
  }

  if (typeof raw !== 'object') return {}

  for (const [key, entry] of Object.entries(raw)) {
    const nk = normalizeKey(key)
    if (RESERVATION_DOC_KEYS.includes(nk) && entry && (entry.path || entry.url)) {
      out[nk] = entry
    }
  }
  return out
}

export function areDocumentsComplete(docs) {
  return RESERVATION_DOC_KEYS.every((k) => Boolean(docs?.[k]?.path || docs?.[k]?.url))
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

async function resolveFileUrl(path) {
  const { data: pub } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path)
  if (pub?.publicUrl) return pub.publicUrl

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
      user_id: userId,
      doc_type: docType,
      storage_path: path,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,doc_type' },
  )
  if (error && error.code !== 'PGRST205') throw error
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
    const entry = await uploadDocument(userId, key, file)
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
    const col = DOC_URL_COLUMNS[key]
    const value = docMap[key] ?? docMap[col]
    if (!value) continue
    if (typeof value === 'string' && value.startsWith('http')) {
      out[key] = value
    } else if (typeof value === 'string') {
      try {
        out[key] = await resolveFileUrl(value)
      } catch {
        out[key] = null
      }
    }
  }
  return out
}
