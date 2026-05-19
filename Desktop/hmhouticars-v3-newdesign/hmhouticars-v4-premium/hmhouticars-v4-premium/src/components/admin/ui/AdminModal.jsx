import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function AdminModal({ open, onClose, title, children, wide = false }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-[#C9A84C]/20 bg-[#0B1623] shadow-2xl ${
              wide ? 'max-w-4xl' : 'max-w-lg'
            }`}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0B1623] z-10">
              <h2 className="font-['Barlow_Condensed',sans-serif] text-xl font-black text-white">{title}</h2>
              <button type="button" onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
