import React from 'react'

const STATUS = {
  confirmed:  { bg: 'rgba(52,211,153,0.1)', text: '#34D399', border: 'rgba(52,211,153,0.2)', dot: '#34D399', label: 'Confirmée' },
  pending:    { bg: 'rgba(251,191,36,0.1)', text: '#FBBF24', border: 'rgba(251,191,36,0.2)', dot: '#FBBF24', label: 'En attente' },
  active:     { bg: 'rgba(99,179,237,0.1)', text: '#63B3ED', border: 'rgba(99,179,237,0.2)', dot: '#63B3ED', label: 'Active' },
  completed:  { bg: 'rgba(148,163,184,0.08)', text: 'rgba(255,255,255,0.5)', border: 'rgba(148,163,184,0.15)', dot: 'rgba(148,163,184,0.5)', label: 'Terminée' },
  cancelled:  { bg: 'rgba(248,113,113,0.1)', text: '#F87171', border: 'rgba(248,113,113,0.2)', dot: '#F87171', label: 'Annulée' },
  rejected:   { bg: 'rgba(248,113,113,0.1)', text: '#F87171', border: 'rgba(248,113,113,0.2)', dot: '#F87171', label: 'Refusée' },
  available:  { bg: 'rgba(52,211,153,0.1)', text: '#34D399', border: 'rgba(52,211,153,0.2)', dot: '#34D399', label: 'Disponible' },
  unavailable:{ bg: 'rgba(248,113,113,0.1)', text: '#F87171', border: 'rgba(248,113,113,0.2)', dot: '#F87171', label: 'Indisponible' },
}

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)', dot: 'rgba(255,255,255,0.4)', label: status }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontFamily: 'Outfit, sans-serif' }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}
