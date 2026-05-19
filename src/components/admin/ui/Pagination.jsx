import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6" role="navigation">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-2 rounded-lg border border-white/10 text-white/70 disabled:opacity-30 hover:bg-white/5"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm text-white/50 px-3">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="p-2 rounded-lg border border-white/10 text-white/70 disabled:opacity-30 hover:bg-white/5"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
