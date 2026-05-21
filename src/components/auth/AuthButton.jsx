import React from 'react'

export default function AuthButton({ loading, children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full btn-gold py-4 mt-2 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 rounded-full" style={{ borderColor: 'rgba(8,14,24,0.3)', borderTopColor: '#080E18', animation: 'spin 0.8s linear infinite' }} />
          Chargement...
        </span>
      ) : children}
    </button>
  )
}
