import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'

function ToastItem({ toast }) {
  const { removeToast } = useApp()
  const isError = toast.type === 'error'
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.3 }}
      className={`bg-navy text-white px-6 py-4 rounded-xl border-l-4
        shadow-[0_8px_30px_rgba(0,0,0,0.3)] max-w-[320px] text-sm font-medium
        flex items-center gap-3 ${isError ? 'border-red-500' : 'border-gold'}`}
    >
      <span>{isError ? '❌' : '✅'}</span>
      <span className="flex-1">{toast.msg}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="bg-transparent border-none text-white/50 cursor-pointer text-base
          hover:text-white transition-colors"
      >
        ✕
      </button>
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="fixed bottom-8 right-4 sm:right-8 z-[999] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
