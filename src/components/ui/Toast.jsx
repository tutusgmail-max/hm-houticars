import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'

function ToastItem({ toast }) {
  const { removeToast } = useApp()
  const isError = toast.type === 'error'
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16,1,0.3,1] }}
      className="flex items-center gap-3 px-5 py-3.5 rounded-2xl max-w-[340px] text-[13px] font-medium"
      style={{
        background: 'rgba(13,20,34,0.95)',
        border: `1px solid ${isError ? 'rgba(248,113,113,0.25)' : 'rgba(201,168,76,0.25)'}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${isError ? 'rgba(248,113,113,0.05)' : 'rgba(201,168,76,0.05)'}`,
        backdropFilter: 'blur(20px)',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      <span className="text-base shrink-0">{isError ? '⚠️' : '✅'}</span>
      <span className="flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{toast.msg}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="bg-transparent border-none cursor-pointer ml-1 rounded-lg w-6 h-6 flex items-center justify-center transition-all hover:bg-white/10 text-sm"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        ✕
      </button>
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="fixed bottom-8 right-4 sm:right-8 z-[999] flex flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
      </AnimatePresence>
    </div>
  )
}
