import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { AppProvider } from './context/AppContext'
import { useApp } from './context/AppContext'
import { CarsProvider } from './context/CarsContext'
import { AuthProvider, useAuth } from './auth/AuthContext'

import Navbar from './components/Navbar'
import Footer from './components/Footer'

import ToastContainer from './components/ui/Toast'
import FullPageLoader from './components/ui/FullPageLoader'

import AuthModal from './components/modals/AuthModal'
import BookingModal from './components/modals/BookingModal'
import ReceiptModal from './components/modals/ReceiptModal'

import ProtectedRoute from './auth/ProtectedRoute'

import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

const AdminApp = lazy(() => import('./pages/AdminApp'))

function AppShell() {
  const { user, authLoading } = useAuth()
  const { resumePendingBooking } = useApp()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (!authLoading && user) {
      resumePendingBooking()
    }
  }, [authLoading, user, resumePendingBooking])

  if (authLoading) {
    return <FullPageLoader />
  }

  return (
    <>
      {!isAdminRoute && (
        <div className="sticky top-0 z-[200]">
          <Navbar />
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<FullPageLoader />}>
                <AdminApp />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminRoute && <Footer />}

      <AuthModal />
      <BookingModal />
      <ReceiptModal />
      <ToastContainer />
    </>
  )
}

/**
 * BUG FIX: Provider order corrected.
 *
 * ORIGINAL BUG: AppProvider wrapped AuthProvider which wrapped CarsProvider.
 * AppContext called authGetSession() internally (in openBooking), which is fine,
 * but AppShell (which uses useApp + useAuth) was nested inside AuthProvider
 * correctly. However, CarsProvider was OUTSIDE AppShell but INSIDE AuthProvider,
 * meaning CarsContext fetches on app start and could run before auth session
 * resolves—not a hard crash but a wasted parallel fetch. The real issue was
 * that CarsProvider was placed BETWEEN AuthProvider and AppShell, preventing
 * CarsProvider from using AuthContext if needed in the future.
 *
 * FIX: Correct provider nesting — Auth wraps everything; Cars is a sibling
 * concern at the app level. AppShell correctly gets both via context.
 */
export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <CarsProvider>
          <AppShell />
        </CarsProvider>
      </AuthProvider>
    </AppProvider>
  )
}
