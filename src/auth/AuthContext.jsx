/**
 * AuthContext — single mount listener, no duplicate getSession/signUp triggers.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { authOnChange, authSignOut } from '../services/auth.service'
import { fetchProfile } from '../services/profile.service'
import { isAdminRole, logAdminRoleDebug, resolveEffectiveRole } from '../utils/adminRole'
import { fetchUserDocuments, parseDocuments } from '../services/documentUpload.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userDocuments, setUserDocuments] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)

  const bootstrappedRef = useRef(false)
  const userIdRef = useRef(null)
  const profileInflightRef = useRef(new Map())
  const lastSignedInRef = useRef({ userId: null, at: 0 })

  const loadUserDocuments = useCallback(async (userId, legacyProfile) => {
    if (!userId) { setUserDocuments(null); return null }
    setDocumentsLoading(true)
    try {
      const docs = await fetchUserDocuments(userId)
      setUserDocuments(docs)
      return docs
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AuthContext] loadUserDocuments:', err?.message)
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

  const loadProfile = useCallback(async (sessionUserOrUserId, { force = false } = {}) => {
    const sessionUser = typeof sessionUserOrUserId === 'string' ? null : sessionUserOrUserId
    const userId = typeof sessionUserOrUserId === 'string'
      ? sessionUserOrUserId
      : sessionUserOrUserId?.id

    if (!userId) return null

    if (!force && profileInflightRef.current.has(userId)) {
      return profileInflightRef.current.get(userId)
    }

    const promise = (async () => {
      setProfileLoading(true)
      try {
        const data = await fetchProfile(userId, sessionUser)
        setProfile(data)
        return data
      } catch (err) {
        if (import.meta.env.DEV && err?.code !== 'PGRST116') {
          console.error('[AuthContext] loadProfile:', err?.message)
        }
        setProfile(null)
        return null
      } finally {
        setProfileLoading(false)
        profileInflightRef.current.delete(userId)
      }
    })()

    profileInflightRef.current.set(userId, promise)
    return promise
  }, [])

  const refreshSessionRef = useRef(null)
  refreshSessionRef.current = async (sessionUser, { forceProfile = false } = {}) => {
    if (!sessionUser) {
      setProfile(null)
      setUserDocuments(null)
      profileInflightRef.current.clear()
      return
    }
    if (forceProfile) profileInflightRef.current.delete(sessionUser.id)
    const prof = await loadProfile(sessionUser, { force: forceProfile })
    await loadUserDocuments(sessionUser.id, prof)
    logAdminRoleDebug('refreshSession', { user: sessionUser, profile: prof })
  }

  const applySessionRef = useRef(null)
  applySessionRef.current = (sessionUser, { refreshProfile = false } = {}) => {
    const prevId = userIdRef.current
    const nextId = sessionUser?.id ?? null
    userIdRef.current = nextId
    setUser(sessionUser)

    if (sessionUser && (refreshProfile || nextId !== prevId)) {
      refreshSessionRef.current(sessionUser, { forceProfile: refreshProfile }).catch(() => {})
    }
    if (!sessionUser) {
      setProfile(null)
      setUserDocuments(null)
      profileInflightRef.current.clear()
    }
  }

  // ONE effect, empty deps — never re-subscribe on render (prevents listener/callback leaks)
  useEffect(() => {
    let mounted = true

    const finishBootstrap = (sessionUser) => {
      if (!mounted || bootstrappedRef.current) return
      bootstrappedRef.current = true
      applySessionRef.current(sessionUser, { refreshProfile: !!sessionUser })
      setAuthLoading(false)
    }

    const bootstrapTimeout = window.setTimeout(() => {
      if (!mounted || bootstrappedRef.current) return
      bootstrappedRef.current = true
      setAuthLoading(false)
      if (import.meta.env.DEV) {
        console.error('[Auth] bootstrap timeout — INITIAL_SESSION not received')
      }
    }, 8000)

    const handleAuthEvent = (event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        const sessionUser = session?.user ?? null
        if (sessionUser) {
          refreshSessionRef.current(sessionUser, { forceProfile: true }).catch(() => {})
        }
        return
      }

      const sessionUser = session?.user ?? null

      if (event === 'INITIAL_SESSION') {
        finishBootstrap(sessionUser)
        return
      }

      if (!bootstrappedRef.current) {
        finishBootstrap(sessionUser)
        return
      }

      setAuthLoading(false)

      if (event === 'SIGNED_OUT') {
        applySessionRef.current(null)
        return
      }

      if (event === 'SIGNED_IN' && sessionUser?.id) {
        const now = Date.now()
        if (
          lastSignedInRef.current.userId === sessionUser.id
          && now - lastSignedInRef.current.at < 3000
        ) {
          setUser(sessionUser)
          return
        }
        lastSignedInRef.current = { userId: sessionUser.id, at: now }
      }

      if (sessionUser) {
        const refreshProfile = event === 'USER_UPDATED'
          || event === 'SIGNED_IN'
          || sessionUser.id !== userIdRef.current
        applySessionRef.current(sessionUser, { refreshProfile })
      } else {
        applySessionRef.current(null)
      }
    }

    const subscription = authOnChange(handleAuthEvent)

    return () => {
      mounted = false
      window.clearTimeout(bootstrapTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
  }, [])

  const effectiveRole = resolveEffectiveRole(profile, user)
  const isAdmin = isAdminRole(profile, user)
  const isEmailVerified = true

  useEffect(() => {
    if (!user && !profile) return
    logAdminRoleDebug('state', { user, profile })
  }, [user, profile, effectiveRole, isAdmin])

  const value = useMemo(() => ({
    user,
    profile,
    userDocuments,
    authLoading,
    profileLoading,
    documentsLoading,
    effectiveRole,
    isAdmin,
    isEmailVerified,
    loadProfile,
    loadUserDocuments,
    signOut,
  }), [
    user,
    profile,
    userDocuments,
    authLoading,
    profileLoading,
    documentsLoading,
    effectiveRole,
    isAdmin,
    loadProfile,
    loadUserDocuments,
    signOut,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
