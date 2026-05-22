/**
 * ProtectedRoute — auth modal via effect; admin waits for profile resolution.
 */
import React, { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useApp } from '../context/AppContext'
import FullPageLoader from '../components/ui/FullPageLoader'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, authLoading, profileLoading, profileReady, isAdmin, loadProfile } = useAuth()
  const { openAuth } = useApp()
  const openAuthRef = useRef(openAuth)
  openAuthRef.current = openAuth
  const authPromptedRef = useRef(false)
  const [adminVerified, setAdminVerified] = useState(!adminOnly)

  useEffect(() => {
    if (authLoading || user) {
      if (user) authPromptedRef.current = false
      return
    }
    if (authPromptedRef.current) return
    authPromptedRef.current = true
    openAuthRef.current('login')
  }, [authLoading, user?.id])

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

  if (!user) return <Navigate to="/" replace state={{ authRequired: true }} />

  if (adminOnly && (!profileReady || profileLoading || !adminVerified)) {
    return <FullPageLoader />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ adminDenied: true }} />
  }

  return children
}
