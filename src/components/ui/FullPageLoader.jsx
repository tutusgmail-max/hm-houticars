import React from 'react'
import { motion } from 'framer-motion'

export default function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080E18' }}>
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl select-none"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C76A)', color: '#080E18', fontFamily: 'Outfit, sans-serif' }}
        >
          HM
        </motion.div>
        {/* Spinner ring */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-10 h-10"
        >
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(201,168,76,0.1)' }} />
          <div className="absolute inset-0 rounded-full" style={{ border: '2px solid transparent', borderTopColor: '#C9A84C', animation: 'spin 0.8s linear infinite' }} />
        </motion.div>
      </div>
    </div>
  )
}
