import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminDataProvider } from '../context/AdminDataContext'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'

const TITLES = {
  '/admin': { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité' },
  '/admin/fleet': { title: 'Gestion de la flotte', subtitle: 'Véhicules, images et disponibilité' },
  '/admin/reservations': { title: 'Réservations', subtitle: 'Suivi et validation des locations' },
  '/admin/documents': { title: 'Centre documents', subtitle: 'CIN et permis clients' },
  '/admin/customers': { title: 'Clients', subtitle: 'Base clients et historique' },
  '/admin/settings': { title: 'Paramètres', subtitle: 'Configuration du site' },
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const meta = TITLES[pathname] || TITLES['/admin']

  return (
    <AdminDataProvider>
      <div className="min-h-screen bg-[#0a0f14] text-white">
        <div
          className="fixed inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 80% 0%, rgba(201,168,76,0.12) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 0% 100%, rgba(30,51,83,0.5) 0%, transparent 50%)',
          }}
        />
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[290] bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer menu"
          />
        )}
        <div
          className={`relative transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'}`}
        >
          <AdminHeader
            title={meta.title}
            subtitle={meta.subtitle}
            onMenuClick={() => setMobileOpen(true)}
          />
          <main className="p-4 sm:p-8 max-w-[1600px] mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminDataProvider>
  )
}
