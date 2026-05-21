import React from 'react'
import { motion } from 'framer-motion'
import GlassCard from './GlassCard'

export default function SimpleBarChart({ title, data, valueKey = 'count', labelKey = 'label', formatValue }) {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1)

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[13px] font-bold text-white/85" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: 'rgba(201,168,76,0.6)', fontFamily: 'Outfit, sans-serif' }}>6 mois</span>
      </div>
      <div className="flex items-end justify-between gap-3 h-36">
        {data.map((item, i) => {
          const h = ((item[valueKey] || 0) / max) * 100
          const val = formatValue ? formatValue(item[valueKey]) : item[valueKey]
          return (
            <div key={item[labelKey] || i} className="flex-1 flex flex-col items-center gap-2 group">
              {/* Value tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>{val}</div>
              <div className="w-full flex-1 flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16,1,0.3,1] }}
                  className="w-full min-h-[4px] rounded-t-lg relative overflow-hidden cursor-pointer"
                  style={{ background: 'linear-gradient(to top, #C9A84C, rgba(232,199,106,0.5))' }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to top, #E8C76A, rgba(255,248,200,0.7))' }} />
                </motion.div>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[1px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit, sans-serif' }}>{item[labelKey]}</span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
