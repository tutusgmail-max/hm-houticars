/**
 * ProtectedRoute.jsx
 *
 * BUG FIXED: Original called openAuth() during render — a React rule violation.
 * Side effects during render cause double-invocation in StrictMode and
 * can lead to infinite re-render loops.
 *
 * FIX: Use useEffect to trigger the modal after render.
 * Also: admin check now waits for profile to load before redirecting.
 */
import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useApp } from '../context/AppContext'
import FullPageLoader from '../components/ui/FullPageLoader'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, authLoading, profileLoading, isAdmin } = useAuth()
  const { openAuth } = useApp()

  // FIX: trigger auth modal via effect, not during render
  useEffect(() => {
    if (!authLoading && !user) {
      openAuth('login')
    }
  }, [authLoading, user, openAuth])

  // Show loader while checking session
  if (authLoading) return <FullPageLoader />

  // Not authenticated — redirect (modal opened via effect above)
  if (!user) return <Navigate to="/" replace />

  // Wait for profile before admin check
  if (adminOnly && profileLoading) return <FullPageLoader />

  // Authenticated but not admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ adminDenied: true }} />
  }

  return children
}
