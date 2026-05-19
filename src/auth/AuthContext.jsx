/**
 * AuthContext.jsx
 * Single source of truth for authentication state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authGetSession, authOnChange, authSignOut } from '../services/auth.service'
import { fetchProfile } from '../services/profile.service'
import { fetchUserDocuments, parseDocuments } from '../services/documentUpload.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userDocuments, setUserDocuments] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const profileFetchRef = useRef(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      setProfileReady(true)
      profileFetchRef.current = null
      return
    }

    if (profileFetchRef.current === userId && profileLoading) return
    profileFetchRef.current = userId
    setProfileLoading(true)
    setProfileReady(false)

    console.debug('[AuthContext] loadProfile start', {
      userId,
      profileFetchRef: profileFetchRef.current,
      previousProfile: profile,
    })

    try {
      const data = await fetchProfile(userId)
      console.debug('[AuthContext] loadProfile success', { userId, profile: data })
      setProfile(data)
    } catch (err) {
      if (err?.code !== 'PGRST116') {
        console.warn('[AuthContext] loadProfile error:', err?.message)
      } else {
        console.debug('[AuthContext] loadProfile no profile found', { userId, error: err.message })
      }
      setProfile(null)
    } finally {
      setProfileLoading(false)
      setProfileReady(true)
      profileFetchRef.current = null
    }
  }, [profileLoading, profile])

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

  const refreshSession = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null)
      setProfileReady(false)
      setUserDocuments(null)
      profileFetchRef.current = null
      return
    }

    console.debug('[AuthContext] refreshSession', {
      userId: sessionUser.id,
      email: sessionUser.email,
      user: sessionUser,
    })

    setProfileReady(false)
    let prof = null
    try {
      prof = await fetchProfile(sessionUser.id)
      console.debug('[AuthContext] refreshSession profile', { userId: sessionUser.id, profile: prof })
      setProfile(prof)
    } catch (err) {
      if (err?.code !== 'PGRST116') console.warn('[AuthContext] refreshSession loadProfile:', err?.message)
      setProfile(null)
    } finally {
      setProfileReady(true)
    }

    await loadUserDocuments(sessionUser.id, prof)
  }, [loadUserDocuments])

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        const session = await authGetSession()
        if (!mounted) return

        const sessionUser = session?.user ?? null
        console.debug('[AuthContext] authGetSession result', { session, sessionUser })
        setUser(sessionUser)

        if (sessionUser) {
          await refreshSession(sessionUser)
        } else {
          setProfile(null)
          setProfileReady(false)
        }
      } catch (err) {
        if (mounted) {
          setProfile(null)
          setProfileReady(false)
        }
        console.warn('[AuthContext] authGetSession failed', err)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    initAuth()

    const subscription = authOnChange((event, session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      console.debug('[AuthContext] authOnChange', { event, sessionUser })
      setUser(sessionUser)
      if (sessionUser) {
        refreshSession(sessionUser)
      } else {
        setProfile(null)
        setProfileReady(false)
        setUserDocuments(null)
        profileFetchRef.current = null
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [refreshSession])

  const signOut = useCallback(async () => {
    setProfile(null)
    setProfileReady(false)
    setUserDocuments(null)
    profileFetchRef.current = null
    await authSignOut()
  }, [])

  const isAdmin = profile?.role?.toString().toLowerCase() === 'admin'
  const isEmailVerified = user?.email_confirmed_at != null

  console.debug('[AuthContext] auth state', {
    userId: user?.id,
    email: user?.email,
    profile,
    profileReady,
    profileLoading,
    isAdmin,
  })

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userDocuments,
      authLoading,
      profileLoading,
      profileReady,
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
