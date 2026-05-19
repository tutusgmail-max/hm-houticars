/**
 * IdentityDocumentsSection — optional upload from dashboard (not required at signup)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { FiCheck, FiUpload } from 'react-icons/fi'
import { RESERVATION_DOC_TYPES } from '../../constants/identityDocuments'
import {
  parseDocuments,
  areDocumentsComplete,
  resolveDocumentUrls,
  uploadSingleDocument,
} from '../../services/documentUpload.service'

export default function IdentityDocumentsSection({ userId, userDocuments, onUpdated, addToast }) {
  const [docs, setDocs] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploadingKey, setUploadingKey] = useState(null)
  const fileRefs = useRef({})

  const refresh = useCallback(async () => {
    if (!userDocuments || Object.keys(userDocuments).length === 0) {
      setDocs({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const resolved = await resolveDocumentUrls(userDocuments)
      setDocs(parseDocuments(resolved))
    } catch {
      setDocs(parseDocuments(userDocuments))
    } finally {
      setLoading(false)
    }
  }, [userDocuments])

  useEffect(() => {
    refresh()
  }, [refresh])

  const complete = areDocumentsComplete(docs)

  const handleFile = async (key, file) => {
    if (!file?.type?.startsWith('image/')) {
      addToast('Format image uniquement (JPG, PNG).', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Fichier max 5 Mo.', 'error')
      return
    }
    setUploadingKey(key)
    try {
      const merged = await uploadSingleDocument(userId, key, file, userDocuments)
      setDocs(parseDocuments(merged))
      await onUpdated?.()
      addToast('Document enregistré sur votre profil.')
    } catch (err) {
      addToast(err?.message || 'Échec du téléchargement.', 'error')
    } finally {
      setUploadingKey(null)
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-[#f0f2f5]">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-condensed font-black text-navy text-[1.15rem] mb-1">
            Documents d&apos;identité
          </h3>
          <p className="text-text-muted text-sm">
            Optionnel ici — obligatoire uniquement lors de votre première réservation. Une fois enregistrés, ils sont réutilisés automatiquement.
          </p>
        </div>
        {complete && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold border border-emerald-200">
            <FiCheck /> Dossier complet
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RESERVATION_DOC_TYPES.map(({ key, label, icon }) => {
            const saved = docs[key]
            const isUploading = uploadingKey === key
            return (
              <div key={key}>
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-[1px] mb-2">
                  {icon} {label}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isUploading && fileRefs.current[key]?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileRefs.current[key]?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-3 min-h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
                    ${saved ? 'border-emerald-300 bg-emerald-50/50' : 'border-[#dde1e8] hover:border-gold/50 bg-[#fafbfc]'}
                    ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {saved?.url && !saved.url.toLowerCase().includes('.pdf') && !saved.url.includes('application/pdf') ? (
                    <>
                      <img src={saved.url} alt={label} className="w-full h-[72px] object-cover rounded-lg" />
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <FiCheck /> Enregistré
                      </span>
                    </>
                  ) : (
                    <>
                      <FiUpload className="text-navy/40 text-xl" />
                      <span className="text-[12px] text-text-muted text-center">Cliquer pour télécharger</span>
                    </>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                      <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={(el) => { fileRefs.current[key] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(key, f)
                    e.target.value = ''
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
