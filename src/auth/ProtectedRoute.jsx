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
import React, { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useApp } from '../context/AppContext'
import FullPageLoader from '../components/ui/FullPageLoader'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, authLoading, profileLoading, isAdmin, loadProfile } = useAuth()
  const { openAuth } = useApp()
  const [adminRetry, setAdminRetry] = useState(0)
  const retryTimerRef = useRef(null)
  const authPromptedRef = useRef(false)

  // FIX: trigger auth modal via effect, not during render (once per visit)
  useEffect(() => {
    if (authLoading || user) {
      if (user) authPromptedRef.current = false
      return
    }
    if (authPromptedRef.current) return
    authPromptedRef.current = true
    openAuth('login')
  }, [authLoading, user, openAuth])

  // PRODUCTION FIX:
  // If the user was just promoted to admin (or profile fetch previously failed),
  // the app might still have a stale `profile` in memory/local state.
  // Re-check profile when entering an admin-only route to prevent "random admin denied".
  useEffect(() => {
    if (!adminOnly) return
    if (authLoading) return
    if (!user) return
    if (isAdmin) return
    // Try to reload profile once; AuthContext has its own inflight guard.
    loadProfile?.(user)
  }, [adminOnly, authLoading, user, isAdmin, loadProfile])

  // If profile fetch fails transiently, retry a couple of times then fail closed.
  useEffect(() => {
    if (!adminOnly) return
    if (authLoading) return
    if (!user) return
    if (isAdmin) return
    if (profileLoading) return
    if (profile) return
    if (adminRetry >= 2) return

    retryTimerRef.current = setTimeout(() => {
      setAdminRetry((n) => n + 1)
      loadProfile?.(user)
    }, 600)

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [adminOnly, authLoading, user, isAdmin, profileLoading, profile, adminRetry, loadProfile])

  // Show loader while checking session
  if (authLoading) return <FullPageLoader />

  // Not authenticated — redirect (modal opened via effect above)
  if (!user) return <Navigate to="/" replace />

  // Wait for profile before admin check
  if (adminOnly && profileLoading) return <FullPageLoader />

  // If admin route and profile not loaded yet (transient fetch failure),
  // keep showing a loader briefly instead of immediately denying.
  if (adminOnly && !profileLoading && user && !profile) {
    if (adminRetry >= 2) {
      return <Navigate to="/" replace state={{ adminDenied: true }} />
    }
    return <FullPageLoader />
  }

  // Authenticated but not admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ adminDenied: true }} />
  }

  return children
}
