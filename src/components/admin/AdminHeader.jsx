import React from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useAdminData } from '../../context/AdminDataContext'
import { Bell, Menu, RefreshCw } from 'lucide-react'

export default function AdminHeader({ title, subtitle, onMenuClick }) {
  const { profile } = useAuth()
  const { refresh, loading } = useAdminData()

  return (
    <header className="sticky top-0 z-[250] border-b border-white/10 bg-[#0a0f14]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onMenuClick} className="lg:hidden p-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5">
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-['Barlow_Condensed',sans-serif] text-2xl font-black text-white truncate">{title}</h1>
            {subtitle && <p className="text-sm text-white/45 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button type="button" onClick={refresh} disabled={loading} className="p-2.5 rounded-xl border border-white/10 text-white/60 hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-colors disabled:opacity-50" title="Actualiser">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="p-2.5 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A84C]" />
          </button>
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] flex items-center justify-center text-[#0B1623] font-black text-sm">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white leading-tight">{profile?.full_name || 'Admin'}</p>
              <p className="text-[10px] text-[#C9A84C] uppercase tracking-wider">Administrateur</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
