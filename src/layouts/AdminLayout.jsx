/**
 * AdminLayout.jsx — production data layer + mobile-first shell
 */
import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'
import { AdminDataProvider, useAdminData } from '../context/AdminDataContext'

const PAGE_TITLES = {
  '/admin': { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de l\'activité' },
  '/admin/fleet': { title: 'Flotte', subtitle: 'Gestion des véhicules' },
  '/admin/calendar': { title: 'Calendrier', subtitle: 'Disponibilités et réservations' },
  '/admin/reservations': { title: 'Réservations', subtitle: 'Demandes et confirmations' },
  '/admin/documents': { title: 'Documents', subtitle: 'Pièces d\'identité clients' },
  '/admin/customers': { title: 'Clients', subtitle: 'Profils et historique' },
  '/admin/settings': { title: 'Paramètres', subtitle: 'Configuration de l\'agence' },
}

function resolvePageMeta(pathname) {
  const base = pathname.replace(/\/$/, '') || '/admin'
  if (PAGE_TITLES[base]) return PAGE_TITLES[base]
  const match = Object.keys(PAGE_TITLES)
    .filter((k) => k !== '/admin')
    .find((k) => base.startsWith(k))
  return match ? PAGE_TITLES[match] : { title: 'Administration', subtitle: '' }
}

function AdminLoadingGate() {
  return (
    <div className="admin-stats-grid">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}

function AdminLayoutInner() {
  const location = useLocation()
  const { loading, error, refresh, refreshing, reservations } = useAdminData()
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { title, subtitle } = resolvePageMeta(location.pathname)
  const showInitialLoader = loading && reservations.length === 0

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen)
    return () => document.body.classList.remove('sidebar-open')
  }, [sidebarOpen])

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-overlay lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className={`admin-content ${collapsed ? 'admin-content--collapsed' : ''}`}>
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          refreshing={refreshing}
        />

        {error && (
          <div className="mx-4 sm:mx-8 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="min-w-0">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading || refreshing}
              className="admin-btn admin-btn--ghost text-xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Réessayer
            </button>
          </div>
        )}

        <main className="admin-main">
          {showInitialLoader ? <AdminLoadingGate /> : <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <AdminDataProvider>
      <AdminLayoutInner />
    </AdminDataProvider>
  )
}
