/**
 * ReservationDocumentUpload — premium 4-card upload (CIN + permis, recto/verso)
 */
import React, { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FiUpload, FiCheck, FiFile, FiAlertCircle } from 'react-icons/fi'
import {
  RESERVATION_DOC_TYPES,
  ACCEPTED_DOC_EXTENSIONS,
  MAX_DOC_SIZE_BYTES,
} from '../../constants/identityDocuments'
import { validateDocumentFile } from '../../services/documentUpload.service'

function isPdf(file) {
  return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf')
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function DocumentCard({
  docKey,
  label,
  icon,
  hint,
  file,
  preview,
  error,
  progress,
  disabled,
  onFile,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = React.useState(false)

  const applyFile = useCallback(
    (f) => {
      if (!f) return
      const err = validateDocumentFile(f)
      if (err) {
        onFile(docKey, null, err)
        return
      }
      onFile(docKey, f, null)
    },
    [docKey, onFile],
  )

  const status = progress === 100 ? 'done' : progress > 0 ? 'uploading' : file ? 'ready' : 'empty'
  const borderClass = error
    ? 'border-red-400/60'
    : status === 'done'
      ? 'border-emerald-400/50'
      : status === 'ready'
        ? 'border-[#C9A84C]/50'
        : dragOver
          ? 'border-[#C9A84C]'
          : 'border-white/10'

  return (
    <motion.div
      layout
      className={`relative flex flex-col rounded-2xl border-2 border-dashed bg-[#14253A]/80 backdrop-blur-sm transition-colors ${borderClass} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (!disabled) applyFile(e.dataTransfer.files?.[0])
        }}
        className="flex flex-1 flex-col p-4 sm:p-5 min-h-[160px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/50 rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A95A5]">
              {icon} Obligatoire
            </span>
            <h4 className="font-['Barlow_Condensed',sans-serif] text-lg sm:text-xl font-black text-white mt-0.5">
              {label}
            </h4>
            <p className="text-xs text-[#8A95A5] mt-1 line-clamp-2">{hint}</p>
          </div>
          {status === 'done' && (
            <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <FiCheck className="text-lg" />
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center rounded-xl bg-[#0B1623]/50 overflow-hidden min-h-[88px]">
          {preview && file && preview !== 'pdf' && !isPdf(file) ? (
            <img src={preview} alt={label} className="w-full h-24 sm:h-28 object-cover rounded-lg" />
          ) : (preview === 'pdf' || (file && isPdf(file))) ? (
            <div className="flex flex-col items-center gap-2 py-4 text-[#C9A84C]">
              <FiFile className="text-3xl" />
              <span className="text-xs font-semibold text-white truncate max-w-full px-2">{file.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4 text-[#8A95A5]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E3353] text-[#C9A84C]">
                <FiUpload className="text-xl" />
              </div>
              <span className="text-xs font-medium text-center px-2">Cliquer ou glisser-déposer</span>
              <span className="text-[10px] text-[#8A95A5]/80">JPG · PNG · PDF · max 5 Mo</span>
            </div>
          )}
        </div>

        {file && (
          <p className="mt-2 text-[10px] text-[#8A95A5] truncate">
            {file.name} · {formatSize(file.size)}
          </p>
        )}

        {(status === 'uploading' || status === 'done') && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#0B1623] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${status === 'done' ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#C9A84C] to-[#E8C76A]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress || (status === 'ready' ? 0 : 5)}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        )}
      </motion.div>

      {error && (
        <div className="flex items-center gap-1.5 px-4 pb-3 text-red-400 text-xs">
          <FiAlertCircle className="shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_DOC_EXTENSIONS}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          applyFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </motion.div>
  )
}

export default function ReservationDocumentUpload({
  docs,
  docPreviews,
  errors,
  uploadProgress,
  useSavedDocs,
  savedDocUrls,
  onFile,
  onForceUpload,
  disabled = false,
}) {
  if (useSavedDocs) {
    return (
      <div>
        <header className="mb-6">
          <h3 className="font-['Barlow_Condensed',sans-serif] text-2xl sm:text-3xl font-black text-white">
            Vérification des documents
          </h3>
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">✓ Documents déjà enregistrés</p>
            <p className="text-xs text-[#8A95A5] mt-1">Réutilisés automatiquement pour cette réservation.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {RESERVATION_DOC_TYPES.map(({ key, label, icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-emerald-400/20 bg-[#14253A]/60 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A95A5] mb-1">
                {icon} {label}
              </p>
              {savedDocUrls[key] ? (
                savedDocUrls[key].includes('.pdf') || savedDocUrls[key].includes('pdf') ? (
                  <a
                    href={savedDocUrls[key]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#C9A84C] underline"
                  >
                    Voir le PDF
                  </a>
                ) : (
                  <img
                    src={savedDocUrls[key]}
                    alt={label}
                    className="w-full h-24 object-cover rounded-lg mt-2"
                  />
                )
              ) : (
                <span className="text-xs text-emerald-400">✓ Enregistré</span>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onForceUpload}
          className="w-full py-3 rounded-xl border border-[#C9A84C]/30 text-[#C9A84C] text-sm font-semibold hover:bg-[#C9A84C]/10 transition-colors"
        >
          Remplacer mes documents
        </button>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6">
        <h3 className="font-['Barlow_Condensed',sans-serif] text-2xl sm:text-3xl font-black text-white">
          Vérification des documents
        </h3>
        <p className="text-sm text-[#8A95A5] mt-2 max-w-lg">
          Téléchargez les 4 pièces ci-dessous. Elles seront enregistrées sur votre compte pour vos prochaines réservations.
        </p>
      </header>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {RESERVATION_DOC_TYPES.map(({ key, label, icon, hint }) => (
          <DocumentCard
            key={key}
            docKey={key}
            label={label}
            icon={icon}
            hint={hint}
            file={docs[key] instanceof File ? docs[key] : null}
            preview={docPreviews[key]}
            error={errors[key]}
            progress={uploadProgress[key] ?? (docs[key] ? 0 : undefined)}
            disabled={disabled}
            onFile={onFile}
          />
        ))}
      </motion.div>

      <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 px-4 py-3 text-xs text-[#8A95A5]">
        <span className="text-white font-semibold">🔒 Stockage sécurisé</span>
        {' '}— bucket Supabase <code className="text-[#C9A84C]">documents</code>
        {' '}(dossiers <code className="text-[#C9A84C]">cin/</code> et <code className="text-[#C9A84C]">permis/</code>)
      </div>
    </div>
  )
}
