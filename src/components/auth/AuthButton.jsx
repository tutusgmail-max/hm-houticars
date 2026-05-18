import React from 'react'

export default function AuthButton({ loading, children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full bg-gold text-navy font-bold text-[15px] py-3.5 rounded-[10px]
        border-none cursor-pointer transition-all duration-200 mt-2
        hover:bg-gold-light disabled:opacity-60 disabled:cursor-not-allowed
        hover:shadow-[0_8px_25px_rgba(240,165,0,0.35)]"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
          Chargement...
        </span>
      ) : children}
    </button>
  )
}
