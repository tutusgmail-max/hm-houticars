import React from 'react'

export default function FullPageLoader() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-gold text-navy font-condensed font-black text-2xl px-3 py-1.5 rounded-md select-none">
          HM
        </div>
        <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    </div>
  )
}
