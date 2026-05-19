import React from 'react'
import { STATUS_STYLES } from '../../../data'

const ADMIN_STATUS = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending
  const dark = ADMIN_STATUS[status] || ADMIN_STATUS.pending
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${dark}`}>
      {s.label}
    </span>
  )
}
