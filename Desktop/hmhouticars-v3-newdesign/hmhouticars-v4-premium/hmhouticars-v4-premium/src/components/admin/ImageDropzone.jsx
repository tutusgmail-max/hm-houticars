import React, { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, ImageIcon } from 'lucide-react'

export default function ImageDropzone({ files, onChange, previews = [] }) {
  const [drag, setDrag] = useState(false)

  const addFiles = useCallback(
    (list) => {
      const next = [...files, ...Array.from(list).filter((f) => f.type.startsWith('image/'))]
      onChange(next)
    },
    [files, onChange],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const removeAt = (idx) => onChange(files.filter((_, i) => i !== idx))

  const previewUrls = files.map((f) => URL.createObjectURL(f))

  return (
    <div className="space-y-3">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        animate={{ borderColor: drag ? 'rgba(201,168,76,0.8)' : 'rgba(201,168,76,0.3)' }}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer ${
          drag ? 'bg-[#C9A84C]/10' : 'bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        <Upload className="text-[#C9A84C]" size={28} />
        <p className="text-sm text-white/60 text-center">
          Glissez vos images ici ou <span className="text-[#C9A84C] font-semibold">parcourir</span>
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        />
      </motion.div>

      {(previewUrls.length > 0 || previews.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {previews.map((url) => (
            <motion.div key={url} className="w-20 h-14 rounded-lg overflow-hidden border border-white/10">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </motion.div>
          ))}
          {previewUrls.map((url, i) => (
            <motion.div key={url} className="relative w-20 h-14 rounded-lg overflow-hidden border border-white/10 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/70 text-white opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
