/**
 * AuthContext — single mount listener, no duplicate getSession/signUp triggers.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { authOnChange, authSignOut } from '../services/auth.service'
import { fetchProfile } from '../services/profile.service'
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

  const loadProfile = useCallback(async (sessionUserOrUserId) => {
    const userId = typeof sessionUserOrUserId === 'string'
      ? sessionUserOrUserId
      : sessionUserOrUserId?.id

    if (!userId) return null

    if (profileInflightRef.current.has(userId)) {
      return profileInflightRef.current.get(userId)
    }

    const promise = (async () => {
      setProfileLoading(true)
      try {
        const data = await fetchProfile(
          userId,
          typeof sessionUserOrUserId === 'string' ? null : sessionUserOrUserId,
        )
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
        profileInflightRef.current.delete(userId)
      }
    })()

    profileInflightRef.current.set(userId, promise)
    return promise
  }, [])

  const refreshSessionRef = useRef(null)
  refreshSessionRef.current = async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null)
      setUserDocuments(null)
      profileInflightRef.current.clear()
      return
    }
    const prof = await loadProfile(sessionUser)
    await loadUserDocuments(sessionUser.id, prof)
  }

  const applySessionRef = useRef(null)
  applySessionRef.current = (sessionUser, { refreshProfile = false } = {}) => {
    const prevId = userIdRef.current
    const nextId = sessionUser?.id ?? null
    userIdRef.current = nextId
    setUser(sessionUser)

    if (sessionUser && (refreshProfile || nextId !== prevId)) {
      refreshSessionRef.current(sessionUser).catch(() => {})
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

    const handleAuthEvent = (event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') return

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
          || (event === 'SIGNED_IN' && sessionUser.id !== userIdRef.current)
        applySessionRef.current(sessionUser, { refreshProfile })
      } else {
        applySessionRef.current(null)
      }
    }

    const subscription = authOnChange(handleAuthEvent)

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
  }, [])

  const isAdmin = profile?.role === 'admin'
  const isEmailVerified = true

  const value = useMemo(() => ({
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
  }), [
    user,
    profile,
    userDocuments,
    authLoading,
    profileLoading,
    documentsLoading,
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
