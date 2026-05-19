import React from 'react'
import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', hover = false, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2, borderColor: 'rgba(201,168,76,0.35)' } : undefined}
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
