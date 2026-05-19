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
  const { user, profile, authLoading, profileLoading, profileReady, isAdmin } = useAuth()
  const { openAuth } = useApp()

  useEffect(() => {
    if (!authLoading && !user) {
      openAuth('login')
    }
  }, [authLoading, user, openAuth])

  useEffect(() => {
    console.debug('[ProtectedRoute] auth check', {
      userId: user?.id,
      email: user?.email,
      profile,
      profileLoading,
      profileReady,
      isAdmin,
      adminOnly,
    })
  }, [user, profile, profileLoading, profileReady, isAdmin, adminOnly])

  if (authLoading) return <FullPageLoader />

  if (!user) return <Navigate to="/" replace />

  if (adminOnly && (profileLoading || !profileReady)) {
    return <FullPageLoader />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ adminDenied: true }} />
  }

  return children
}
