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
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const profileFetchRef = useRef(null)

  const loadProfile = useCallback(async (userId) => {
    if (profileFetchRef.current === userId) return
    profileFetchRef.current = userId
    setProfileLoading(true)
    try {
      const data = await fetchProfile(userId)
      setProfile(data)
    } catch (err) {
      if (err?.code !== 'PGRST116') {
        console.warn('[AuthContext] loadProfile error:', err?.message)
      }
      setProfile(null)
    } finally {
      setProfileLoading(false)
      profileFetchRef.current = null
    }
  }, [])

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
      setUserDocuments(null)
      profileFetchRef.current = null
      return
    }
    let prof = null
    try {
      prof = await fetchProfile(sessionUser.id)
      setProfile(prof)
    } catch (err) {
      if (err?.code !== 'PGRST116') console.warn('[AuthContext] loadProfile:', err?.message)
      setProfile(null)
    }
    await loadUserDocuments(sessionUser.id, prof)
  }, [loadUserDocuments])

  useEffect(() => {
    let mounted = true

    authGetSession().then((session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) refreshSession(sessionUser)
      setAuthLoading(false)
    }).catch(() => {
      if (mounted) setAuthLoading(false)
    })

    const subscription = authOnChange((_event, session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) refreshSession(sessionUser)
      else {
        setProfile(null)
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
    await authSignOut()
  }, [])

  const isAdmin = profile?.role === 'admin'
  const isEmailVerified = user?.email_confirmed_at != null

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
