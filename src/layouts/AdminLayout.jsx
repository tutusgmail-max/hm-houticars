/**
 * AdminLayout.jsx — v5
 * - AdminDataProvider scoped to /admin
 * - Responsive sidebar (mobile overlay + desktop collapse)
 * - Global error banner + initial loading gate (no infinite spinner on realtime)
 */
import React, { useState } from 'react'
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const { title, subtitle } = resolvePageMeta(location.pathname)
  const showInitialLoader = loading && reservations.length === 0

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-[290] bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`shrink-0 fixed lg:relative z-[300] h-full transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <AdminSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setMobileOpen(true)}
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-100 font-semibold text-xs hover:bg-amber-500/30 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Réessayer
            </button>
          </div>
        )}

        <main className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
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
