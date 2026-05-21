import React from 'react'
import { motion } from 'framer-motion'

const ACCENT_STYLES = {
  default: { bg: 'rgba(201,168,76,0.08)', icon: 'rgba(201,168,76,0.7)', border: 'rgba(201,168,76,0.15)', val: '#C9A84C' },
  emerald: { bg: 'rgba(52,211,153,0.07)', icon: 'rgba(52,211,153,0.7)', border: 'rgba(52,211,153,0.12)', val: '#34D399' },
  blue:    { bg: 'rgba(99,179,237,0.07)', icon: 'rgba(99,179,237,0.7)', border: 'rgba(99,179,237,0.12)', val: '#63B3ED' },
  amber:   { bg: 'rgba(251,191,36,0.07)', icon: 'rgba(251,191,36,0.7)', border: 'rgba(251,191,36,0.12)', val: '#FBBF24' },
  rose:    { bg: 'rgba(248,113,113,0.07)', icon: 'rgba(248,113,113,0.7)', border: 'rgba(248,113,113,0.12)', val: '#F87171' },
}

export default function StatCard({ icon: Icon, label, value, accent = 'default', delay = 0, trend }) {
  const style = ACCENT_STYLES[accent] || ACCENT_STYLES.default

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: delay / 1000, ease: [0.16,1,0.3,1] }}
      className="relative overflow-hidden p-5 rounded-2xl"
      style={{ background: 'rgba(13,20,34,0.7)', border: `1px solid ${style.border}`, backdropFilter: 'blur(12px)' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${style.bg} 0%, transparent 70%)` }} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] mb-2" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}>{label}</p>
          <p className="text-[2rem] font-bold leading-none" style={{ color: style.val, fontFamily: 'Outfit, sans-serif' }}>{value}</p>
          {trend != null && (
            <p className="text-[11px] mt-1.5" style={{ color: trend >= 0 ? '#34D399' : '#F87171', fontFamily: 'Outfit, sans-serif' }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% ce mois
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-xl shrink-0" style={{ background: style.bg }}>
          {Icon && <Icon size={20} style={{ color: style.icon }} />}
        </div>
      </div>
    </motion.div>
  )
}
