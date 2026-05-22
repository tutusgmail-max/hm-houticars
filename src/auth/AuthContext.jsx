/**
 * AuthContext — single auth listener, stable profile/admin resolution.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react'
import { authGetSession, authOnChange, authSignOut } from '../services/auth.service'
import { fetchProfile } from '../services/profile.service'
import { fetchUserDocuments, parseDocuments } from '../services/documentUpload.service'
import { isAdminRole, resolveEffectiveRole } from '../utils/adminRole'
import { clearAuthHashFromUrl } from '../utils/authUrl'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userDocuments, setUserDocuments] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)

  const bootstrappedRef = useRef(false)
  const userIdRef = useRef(null)
  const profileInflightRef = useRef(new Map())

  const loadUserDocuments = useCallback(async (userId, legacyProfile) => {
    if (!userId) {
      setUserDocuments(null)
      return null
    }
    setDocumentsLoading(true)
    try {
      const docs = await fetchUserDocuments(userId)
      setUserDocuments(docs)
      return docs
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[AuthContext] loadUserDocuments:', err?.message)
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

    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      setProfileReady(true)
      return null
    }

    if (!force && profileInflightRef.current.has(userId)) {
      return profileInflightRef.current.get(userId)
    }

    const promise = (async () => {
      setProfileLoading(true)
      setProfileReady(false)
      try {
        const data = await fetchProfile(userId, sessionUser)
        setProfile(data)
        return data
      } catch (err) {
        if (sessionUser && isAdminRole(null, sessionUser)) {
          const fallback = {
            id: userId,
            email: sessionUser.email ?? null,
            role: 'admin',
            full_name: sessionUser.user_metadata?.full_name ?? null,
          }
          setProfile(fallback)
          return fallback
        }
        if (import.meta.env.DEV && err?.code !== 'PGRST116') {
          console.warn('[AuthContext] loadProfile:', err?.message)
        }
        setProfile(null)
        return null
      } finally {
        setProfileLoading(false)
        setProfileReady(true)
        profileInflightRef.current.delete(userId)
      }
    })()

    profileInflightRef.current.set(userId, promise)
    return promise
  }, [])

  const refreshSession = useCallback(async (sessionUser, { forceProfile = false } = {}) => {
    if (!sessionUser) {
      setProfile(null)
      setProfileReady(false)
      setUserDocuments(null)
      profileInflightRef.current.clear()
      return
    }
    if (forceProfile) profileInflightRef.current.delete(sessionUser.id)
    const prof = await loadProfile(sessionUser, { force: forceProfile })
    await loadUserDocuments(sessionUser.id, prof)
  }, [loadProfile, loadUserDocuments])

  const applySession = useCallback((sessionUser, { refreshProfile = false } = {}) => {
    const prevId = userIdRef.current
    const nextId = sessionUser?.id ?? null
    userIdRef.current = nextId
    setUser(sessionUser)

    if (sessionUser && (refreshProfile || nextId !== prevId)) {
      refreshSession(sessionUser, { forceProfile: refreshProfile }).catch(() => {})
    }
    if (!sessionUser) {
      setProfile(null)
      setProfileReady(false)
      setUserDocuments(null)
      profileInflightRef.current.clear()
    }
  }, [refreshSession])

  useEffect(() => {
    let mounted = true

    const finishBootstrap = (sessionUser) => {
      if (!mounted || bootstrappedRef.current) return
      bootstrappedRef.current = true
      applySession(sessionUser, { refreshProfile: !!sessionUser })
      setAuthLoading(false)
    }

    const bootstrapTimeout = window.setTimeout(() => {
      if (!mounted || bootstrappedRef.current) return
      bootstrappedRef.current = true
      setAuthLoading(false)
    }, 8000)

    const handleAuthEvent = (event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        const sessionUser = session?.user ?? null
        if (sessionUser) setUser(sessionUser)
        return
      }

      const sessionUser = session?.user ?? null

      if (event === 'PASSWORD_RECOVERY') {
        setAuthLoading(false)
        if (sessionUser) {
          userIdRef.current = sessionUser.id
          setUser(sessionUser)
        }
        if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
          const hash = window.location.hash || ''
          window.location.replace(`/reset-password${hash}`)
        }
        return
      }

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
        applySession(null)
        clearAuthHashFromUrl()
        return
      }

      if (sessionUser) {
        const refreshProfile =
          event === 'USER_UPDATED'
          || event === 'SIGNED_IN'
          || sessionUser.id !== userIdRef.current
        applySession(sessionUser, { refreshProfile })
        if (event === 'SIGNED_IN') clearAuthHashFromUrl()
      } else {
        applySession(null)
      }
    }

    authGetSession()
      .then((session) => {
        if (!mounted || bootstrappedRef.current) return
        finishBootstrap(session?.user ?? null)
      })
      .catch(() => {
        if (mounted && !bootstrappedRef.current) finishBootstrap(null)
      })

    const subscription = authOnChange(handleAuthEvent)

    return () => {
      mounted = false
      window.clearTimeout(bootstrapTimeout)
      subscription?.unsubscribe?.()
    }
  }, [applySession])

  const signOut = useCallback(async () => {
    setProfile(null)
    setProfileReady(false)
    setUserDocuments(null)
    profileInflightRef.current.clear()
    userIdRef.current = null
    setUser(null)
    await authSignOut()
  }, [])

  const effectiveRole = resolveEffectiveRole(profile, user)
  const isAdmin = isAdminRole(profile, user)
  const isEmailVerified = user?.email_confirmed_at != null

  const value = useMemo(() => ({
    user,
    profile,
    userDocuments,
    authLoading,
    profileLoading,
    profileReady,
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
    profileReady,
    documentsLoading,
    effectiveRole,
    isAdmin,
    isEmailVerified,
    loadProfile,
    loadUserDocuments,
    signOut,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
