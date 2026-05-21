import React from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useAdminData } from '../../context/AdminDataContext'
import { Menu, RefreshCw } from 'lucide-react'
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

  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        <div className="admin-header__left">
          <button
            type="button"
            onClick={onMenuClick}
            className="admin-header__menu-btn"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <div className="admin-header__titles">
            <h1 className="admin-header__title">{title}</h1>
            {subtitle && (
              <p className="admin-header__subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="admin-header__right">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || isRefreshing}
            className="admin-header__icon-btn"
            title="Actualiser les données"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <NotificationsBell />
          <div className="admin-header__profile">
            <div className="admin-header__avatar">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="admin-header__profile-info">
              <p className="admin-header__profile-name">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="admin-header__profile-role">Administrateur</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
