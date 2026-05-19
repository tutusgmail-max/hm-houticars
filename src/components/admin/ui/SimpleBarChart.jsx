import React from 'react'
import { motion } from 'framer-motion'
import GlassCard from './GlassCard'

export default function SimpleBarChart({ title, data, valueKey = 'count', labelKey = 'label', formatValue }) {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1)

  return (
    <GlassCard className="p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-white/45 mb-6">{title}</h3>
      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((item, i) => {
          const h = ((item[valueKey] || 0) / max) * 100
          return (
            <div key={item[labelKey] || i} className="flex-1 flex flex-col items-center gap-2">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="w-full min-h-[4px] rounded-t-lg bg-gradient-to-t from-[#C9A84C] to-[#E8C76A]/60"
                title={formatValue ? formatValue(item[valueKey]) : String(item[valueKey])}
              />
              <span className="text-[10px] text-white/40 font-semibold uppercase">{item[labelKey]}</span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
