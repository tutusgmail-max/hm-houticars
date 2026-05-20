import React from 'react'
import { motion } from 'framer-motion'
import GlassCard from './GlassCard'

export default function StatCard({ icon: Icon, label, value, sub, accent = 'gold', delay = 0 }) {
  const accentClass =
    accent === 'emerald'
      ? 'from-emerald-500/20 to-emerald-500/5 text-emerald-400'
      : accent === 'blue'
        ? 'from-blue-500/20 to-blue-500/5 text-blue-400'
        : accent === 'amber'
          ? 'from-amber-500/20 to-amber-500/5 text-amber-400'
          : 'from-[#C9A84C]/25 to-[#C9A84C]/5 text-[#C9A84C]'

  return (
    <GlassCard hover className="p-5" style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/45 mb-2">{label}</p>
          <motion.p
            className="font-['Barlow_Condensed',sans-serif] text-3xl font-black text-white leading-none"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay / 1000 + 0.1 }}
          >
            {value ?? '—'}
          </motion.p>
          {sub && <p className="text-xs text-white/40 mt-2">{sub}</p>}
        </div>
        {Icon && (
          <motion.div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 ${accentClass}`}
          >
            <Icon size={20} />
          </motion.div>
        )}
      </div>
    </GlassCard>
  )
}
