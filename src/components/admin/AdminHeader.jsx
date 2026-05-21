import React from 'react'
import { Menu, RefreshCw, Search } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useAdminData } from '../../context/AdminDataContext'
import NotificationsBell from './NotificationsBell'

export default function AdminHeader({
  title = 'Administration',
  subtitle = '',
  onMenuClick,
  refreshing,
}) {
  const { profile } = useAuth()
  const { refresh, loading, refreshing: ctxRefreshing } = useAdminData()
  const isRefreshing = refreshing ?? ctxRefreshing
  const now = new Date()
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header
      className="admin-header flex items-center justify-between px-4 sm:px-6 h-[66px] shrink-0"
      style={{
        background: 'rgba(8,14,24,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="admin-header__left flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="admin-header__menu-btn lg:hidden p-2 rounded-lg transition-all hover:bg-white/5"
          aria-label="Ouvrir le menu"
          style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Menu size={20} />
        </button>
        <div className="admin-header__titles min-w-0">
          <h1
            className="admin-header__title text-[17px] font-bold text-white truncate"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {title}
          </h1>
          <p
            className="admin-header__subtitle text-[11px] truncate capitalize"
            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}
          >
            {subtitle || `${dateStr} · ${timeStr}`}
          </p>
        </div>
      </div>

      <div className="admin-header__right flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px]"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          <Search size={13} />
          <span>Rechercher...</span>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || isRefreshing}
          className="admin-header__icon-btn p-2 rounded-lg hover:bg-white/5 disabled:opacity-50"
          title="Actualiser les données"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        <NotificationsBell />

        <div
          className="admin-header__avatar w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-[12px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #E8C76A)',
            color: '#080E18',
            fontFamily: 'Outfit, sans-serif',
          }}
          title={profile?.full_name || 'Admin'}
        >
          {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  )
}
