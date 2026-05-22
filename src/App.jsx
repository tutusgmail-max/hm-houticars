import React, { lazy, Suspense, useEffect, useRef } from 'react'
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
import AuthHashRouter from './auth/AuthHashRouter'

import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

const AdminApp = lazy(() => import('./pages/AdminApp'))

function AppShell() {
  const { user, authLoading } = useAuth()
  const { authModal, closeAuth, resumePendingBooking } = useApp()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  const resumedForUserIdRef = useRef(null)

  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      resumedForUserIdRef.current = null
      return
    }
    if (authLoading) return
    if (resumedForUserIdRef.current === userId) return
    resumedForUserIdRef.current = userId
    resumePendingBooking()
  }, [authLoading, user?.id, resumePendingBooking])

  // Close login modal once session exists (prevents stale "forgot password" UI after sign-in).
  useEffect(() => {
    if (!authLoading && user && authModal) {
      closeAuth()
    }
  }, [authLoading, user?.id, authModal, closeAuth])

  if (authLoading) {
    return <FullPageLoader />
  }

  return (
    <>
      <AuthHashRouter />
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
