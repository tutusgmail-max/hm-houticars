/**
 * AuthContext.jsx
 * Single source of truth for authentication state.
 *
 * BUGS FIXED:
 * 1. profileFetchRef used userId as a "lock" but never cleared it on error,
 *    meaning if fetchProfile threw once, subsequent loadProfile calls for
 *    the same userId would silently no-op forever in that session.
 * 2. refreshSession called loadUserDocuments but also called fetchProfile
 *    directly — duplicating the profile load logic. Unified to one path.
 * 3. onAuthStateChange fired SIGNED_IN on every token refresh, triggering
 *    redundant profile/document fetches. Added event-type guard.
 * 4. No mounted-flag guard in authGetSession().then() — if component
 *    unmounted before promise resolved, setState was called on unmounted
 *    component. Fixed with mounted ref.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authGetSession, authOnChange, authSignOut } from '../services/auth.service'
import { fetchProfile } from '../services/profile.service'
import { fetchUserDocuments, parseDocuments } from '../services/documentUpload.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                       = useState(null)
  const [profile, setProfile]                 = useState(null)
  const [userDocuments, setUserDocuments]     = useState(null)
  const [authLoading, setAuthLoading]         = useState(true)
  const [profileLoading, setProfileLoading]   = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)

  // BUG FIX: Track current inflight userId to prevent duplicate fetches,
  // but store it as a plain ref value (not the userId itself as a lock key
  // that never clears on error).
  const profileFetchingRef = useRef(false)

  const loadUserDocuments = useCallback(async (userId, legacyProfile) => {
    if (!userId) { setUserDocuments(null); return null }
    setDocumentsLoading(true)
    try {
      const docs = await fetchUserDocuments(userId)
      setUserDocuments(docs)
      return docs
    } catch (err) {
      console.warn('[AuthContext] loadUserDocuments:', err?.message)
      if (legacyProfile?.identity_documents) {
        const legacy = parseDocuments(legacyProfile.identity_documents)
        setUserDocuments(legacy)
        return legacy
      }
      setUserDocuments(null)
      return null
    } finally {
      setDocumentsLoading(false)
    }
  }, [])

  // BUG FIX: loadProfile is now re-callable for the same userId (removed
  // broken userId-as-lock pattern). Uses a boolean inflight guard instead.
  const loadProfile = useCallback(async (sessionUserOrUserId) => {
    const userId = typeof sessionUserOrUserId === 'string'
      ? sessionUserOrUserId
      : sessionUserOrUserId?.id

    if (profileFetchingRef.current) return
    profileFetchingRef.current = true
    setProfileLoading(true)
    try {
      const data = await fetchProfile(userId, typeof sessionUserOrUserId === 'string' ? null : sessionUserOrUserId)
      setProfile(data)
      return data
    } catch (err) {
      if (err?.code !== 'PGRST116') {
        console.warn('[AuthContext] loadProfile error:', err?.message)
      }
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
      profileFetchingRef.current = false
    }
  }, [])

  // BUG FIX: Unified refresh path — no duplicate fetch logic.
  const refreshSession = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null)
      setUserDocuments(null)
      profileFetchingRef.current = false
      return
    }
    const prof = await loadProfile(sessionUser)
    await loadUserDocuments(sessionUser.id, prof)
  }, [loadProfile, loadUserDocuments])

  useEffect(() => {
    let mounted = true

    authGetSession().then(async (session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      try {
        if (sessionUser) {
          await refreshSession(sessionUser)
        }
      } finally {
        // Ensure we always exit the initial loading state even if profile/doc fetch fails,
        // otherwise the UI can get stuck and users will trigger requests while effectively
        // unauthenticated (leading to RLS errors like "new row violates row-level security").
        if (mounted) setAuthLoading(false)
      }
    }).catch(() => {
      if (mounted) setAuthLoading(false)
    })

    const subscription = authOnChange((event, session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null

      // BUG FIX: TOKEN_REFRESHED fires on every silent token renewal.
      // It does not change who the user is — skip redundant profile fetches.
      if (event === 'TOKEN_REFRESHED') return

      setUser(sessionUser)

      if (sessionUser) {
        // SIGNED_IN, USER_UPDATED, PASSWORD_RECOVERY
        refreshSession(sessionUser)
      } else {
        // SIGNED_OUT
        setProfile(null)
        setUserDocuments(null)
        profileFetchingRef.current = false
      }

      // Auth loading is done after first event
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [refreshSession])

  const signOut = useCallback(async () => {
    await authSignOut()
  }, [])

  const isAdmin         = profile?.role === 'admin'
  // Instant access after signup — email confirmation disabled in Supabase + UX
  const isEmailVerified = true

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userDocuments,
      authLoading,
      profileLoading,
      documentsLoading,
      isAdmin,
      isEmailVerified,
      loadProfile,
      loadUserDocuments,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
