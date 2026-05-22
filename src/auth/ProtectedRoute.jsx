/**
 * ProtectedRoute — auth modal via effect; admin waits for profile resolution.
 */
import React, { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useApp } from '../context/AppContext'
import FullPageLoader from '../components/ui/FullPageLoader'
import { isRecoveryHash } from '../utils/authUrl'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, authLoading, profileLoading, profileReady, isAdmin, loadProfile } = useAuth()
  const { openAuth } = useApp()
  const location = useLocation()
  const openAuthRef = useRef(openAuth)
  openAuthRef.current = openAuth
  const authPromptedRef = useRef(false)
  const [adminVerified, setAdminVerified] = useState(!adminOnly)

  useEffect(() => {
    if (location.pathname === '/reset-password') return
    if (isRecoveryHash()) return

    if (authLoading || user) {
      if (user) authPromptedRef.current = false
      return
    }
    if (authPromptedRef.current) return
    authPromptedRef.current = true
    openAuthRef.current('login')
  }, [authLoading, user?.id, location.pathname])

  useEffect(() => {
    if (!adminOnly || authLoading || !user) {
      setAdminVerified(!adminOnly)
      return
    }

    let cancelled = false
    setAdminVerified(false)

    ;(async () => {
      await loadProfile(user, { force: true })
      if (!cancelled) setAdminVerified(true)
    })()

    return () => { cancelled = true }
  }, [adminOnly, authLoading, user?.id, user?.user_metadata?.role, user?.app_metadata?.role, loadProfile])

  if (authLoading) return <FullPageLoader />

  if (isRecoveryHash() && location.pathname !== '/reset-password') {
    return <Navigate to={`/reset-password${location.hash}`} replace />
  }

  if (!user) return <Navigate to="/" replace state={{ authRequired: true }} />

  if (adminOnly && (!profileReady || profileLoading || !adminVerified)) {
    return <FullPageLoader />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ adminDenied: true }} />
  }

  return children
}
