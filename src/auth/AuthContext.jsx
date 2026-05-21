/**
 * AuthContext.jsx — session-first bootstrap (no blank screen / infinite loader).
 * Profile loads in background; duplicate auth events are deduped.
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

  const bootstrappedRef = useRef(false)
  const userIdRef = useRef(null)
  const profileInflightRef = useRef(new Map())

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

  const refreshSession = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null)
      setUserDocuments(null)
      profileInflightRef.current.clear()
      return
    }
    const prof = await loadProfile(sessionUser)
    await loadUserDocuments(sessionUser.id, prof)
  }, [loadProfile, loadUserDocuments])

  const applySession = useCallback((sessionUser, { refreshProfile = false } = {}) => {
    const prevId = userIdRef.current
    const nextId = sessionUser?.id ?? null
    userIdRef.current = nextId
    setUser(sessionUser)

    if (sessionUser && (refreshProfile || nextId !== prevId)) {
      refreshSession(sessionUser).catch(() => {})
    }
    if (!sessionUser) {
      setProfile(null)
      setUserDocuments(null)
      profileInflightRef.current.clear()
    }
  }, [refreshSession])

  useEffect(() => {
    let mounted = true

    const finishBootstrap = (sessionUser) => {
      if (!mounted) return
      bootstrappedRef.current = true
      applySession(sessionUser, { refreshProfile: !!sessionUser })
      setAuthLoading(false)
    }

    authGetSession()
      .then((session) => finishBootstrap(session?.user ?? null))
      .catch(() => {
        if (mounted) {
          bootstrappedRef.current = true
          setAuthLoading(false)
        }
      })

    const subscription = authOnChange((event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') return

      const sessionUser = session?.user ?? null

      // Bootstrap via listener only if getSession has not completed yet
      if (event === 'INITIAL_SESSION') {
        if (!bootstrappedRef.current) finishBootstrap(sessionUser)
        return
      }

      setAuthLoading(false)

      if (event === 'SIGNED_OUT') {
        applySession(null)
        return
      }

      if (sessionUser) {
        applySession(sessionUser, { refreshProfile: event === 'SIGNED_IN' || event === 'USER_UPDATED' })
      } else {
        applySession(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const signOut = useCallback(async () => {
    await authSignOut()
  }, [])

  const isAdmin         = profile?.role === 'admin'
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
