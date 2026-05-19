/**
 * AuthField.jsx
 * Reusable labeled field with animated error message.
 * Used in all auth forms.
 */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AuthField({ label, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-custom-mid uppercase tracking-[1.5px] mb-1.5">
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className="text-red-400 text-[11px] mt-1 flex items-center gap-1"
          >
            <span>⚠</span> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
