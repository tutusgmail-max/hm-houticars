import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'

const DashboardHome = lazy(() => import('./admin/DashboardHome'))
const FleetPage = lazy(() => import('./admin/FleetPage'))
const CalendarAdminPage = lazy(() => import('./admin/CalendarAdminPage'))
const ReservationsAdminPage = lazy(() => import('./admin/ReservationsAdminPage'))

const DocumentsAdminPage = lazy(() => import('./admin/DocumentsAdminPage'))
const CustomersAdminPage = lazy(() => import('./admin/CustomersAdminPage'))
const SettingsAdminPage = lazy(() => import('./admin/SettingsAdminPage'))

function PageLoader() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 border-4 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
    </div>
  )
}

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Suspense fallback={<PageLoader />}><DashboardHome /></Suspense>} />
        <Route path="fleet" element={<Suspense fallback={<PageLoader />}><FleetPage /></Suspense>} />
        <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarAdminPage /></Suspense>} />
        <Route path="reservations" element={<Suspense fallback={<PageLoader />}><ReservationsAdminPage /></Suspense>} />

        <Route path="documents" element={<Suspense fallback={<PageLoader />}><DocumentsAdminPage /></Suspense>} />
        <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomersAdminPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsAdminPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
