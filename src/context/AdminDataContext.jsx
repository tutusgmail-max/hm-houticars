/**
 * AdminDataContext.jsx — v4 PRODUCTION
 *
 * FIXES vs v3 :
 * 1. Realtime sur reservations + notifications + user_documents
 * 2. Cleanup propre des channels (pas de fuite mémoire)
 * 3. Toast notifications admin lors d'une nouvelle réservation
 * 4. refreshAll alias stable (AvailabilityCalendar l'utilise)
 * 5. Loading granulaire (initial vs refresh)
 * 6. Error boundary dans refresh()
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getAllReservations, getAllProfiles, mapRowToReservation, supabase } from '../lib/supabase'
import { fetchAllCars } from '../services/cars.service'

const AdminDataContext = createContext(null)

export function AdminDataProvider({ children }) {
  const [reservations, setReservations]   = useState([])
  const [users, setUsers]                 = useState([])
  const [cars, setCars]                   = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [error, setError]                 = useState(null)

  // Ref to avoid concurrent fetches
  const fetchingRef = useRef(false)
  const refreshDebounceRef = useRef(null)

  const updateReservationLocally = useCallback((id, patch) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
  }, [])

  const removeReservationLocally = useCallback((id) => {
    setReservations((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const applyReservationPayload = useCallback((payload) => {
    if (!payload?.new && !payload?.old) return
    if (payload.eventType === 'INSERT' && payload.new) {
      const mapped = mapRowToReservation(payload.new)
      setReservations((prev) => {
        if (prev.some((r) => r.id === mapped.id)) return prev
        return [mapped, ...prev]
      })
      return
    }
    if (payload.eventType === 'UPDATE' && payload.new) {
      const mapped = mapRowToReservation(payload.new)
      setReservations((prev) =>
        prev.map((r) => (r.id === mapped.id ? { ...r, ...mapped } : r)),
      )
      return
    }
    if (payload.eventType === 'DELETE' && payload.old) {
      setReservations((prev) => prev.filter((r) => r.id !== payload.old.id))
    }
  }, [])

  // ─── Fetch admin notifications ───────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (err) {
        // Table missing or schema cache stale — non-fatal for admin UI
        if (err.code !== 'PGRST205' && err.code !== '42P01') {
          console.warn('[AdminData] notifications:', err.message)
        }
        return
      }
      setNotifications(data || [])
    } catch (_) {}
  }, [])

  // ─── Main refresh ─────────────────────────────────────────────────────────
  const refresh = useCallback(async (isInitial = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    if (isInitial) setLoading(true)
    else setRefreshing(true)

    setError(null)
    try {
      /**
       * PRODUCTION FIX:
       * Previously we used Promise.all([...]) which fails-fast. That caused a critical
       * instability where ONE failing request (e.g., cars RLS, temporary network blip)
       * would prevent reservations from loading, making the dashboard look "empty" or
       * stuck, which users reported as "reservations sometimes do not appear".
       *
       * Solution: allSettled + partial state updates. Reservations can still update
       * even if cars/profiles fail, and vice-versa.
       */
      const [resR, profR, fleetR] = await Promise.allSettled([
        getAllReservations(),
        getAllProfiles(),
        fetchAllCars(),
      ])

      const failed = []
      if (resR.status === 'fulfilled') setReservations(Array.isArray(resR.value) ? resR.value : [])
      else {
        console.error('[AdminData] getAllReservations failed:', resR.reason)
        failed.push('réservations')
        setReservations([])
      }

      if (profR.status === 'fulfilled') setUsers(Array.isArray(profR.value) ? profR.value : [])
      else {
        console.error('[AdminData] getAllProfiles failed:', profR.reason)
        failed.push('clients')
        setUsers([])
      }

      if (fleetR.status === 'fulfilled') setCars(Array.isArray(fleetR.value) ? fleetR.value : [])
      else {
        console.error('[AdminData] fetchAllCars failed:', fleetR.reason)
        failed.push('flotte')
        setCars([])
      }

      // Notifications are non-critical; never block the dashboard.
      try { await fetchNotifications() } catch (_) {}

      if (failed.length === 3) {
        const msg =
          resR.reason?.message ||
          profR.reason?.message ||
          fleetR.reason?.message ||
          'Erreur chargement données admin'
        throw new Error(msg)
      }
      if (failed.length > 0) {
        setError(
          `Chargement partiel : ${failed.join(', ')} indisponible(s). Cliquez sur Actualiser pour réessayer.`,
        )
      }
    } catch (err) {
      console.error('[AdminData] refresh error:', err)
      setError(err?.message || 'Erreur chargement données admin')
    } finally {
      if (isInitial) setLoading(false)
      else setRefreshing(false)
      fetchingRef.current = false
    }
  }, [fetchNotifications])

  const scheduleSoftRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    refreshDebounceRef.current = setTimeout(() => {
      refreshDebounceRef.current = null
      refresh(false)
    }, 1200)
  }, [refresh])

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    refresh(true)
  }, [refresh])

  // ─── Realtime subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    // Channel 1 : reservations
    const resChannel = supabase
      .channel('admin-reservations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          applyReservationPayload(payload)
        },
      )
      .subscribe()

    // Channel 2 : notifications (nouvelles réservations admin)
    const notifChannel = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload?.new
          if (!row?.id) return
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev
            return [row, ...prev].slice(0, 50)
          })
        },
      )
      .subscribe()

    // Channel 3 : user_documents (upload documents client)
    const docsChannel = supabase
      .channel('admin-documents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_documents' },
        () => {
          scheduleSoftRefresh()
        },
      )
      .subscribe()

    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
      supabase.removeChannel(resChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(docsChannel)
    }
  }, [applyReservationPayload, scheduleSoftRefresh])

  // ─── Mark notification as read ────────────────────────────────────────────
  const markNotificationRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id)
    } catch (_) {}
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await supabase.from('notifications').update({ read: true }).eq('read', false)
    } catch (_) {}
  }, [])

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active        = reservations.filter((r) => ['pending', 'confirmed'].includes(r.status))
    const reservedCarIds = new Set(active.map((r) => r.car_id).filter(Boolean))
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const newCustomers  = users.filter(
      (u) => u.created_at && new Date(u.created_at).getTime() > thirtyDaysAgo,
    ).length
    const unreadNotifs  = notifications.filter((n) => !n.read).length

    return {
      totalCars:             cars.length,
      availableCars:         cars.filter((c) => c.available).length,
      reservedCars:          reservedCarIds.size,
      totalReservations:     reservations.length,
      pendingReservations:   reservations.filter((r) => r.status === 'pending').length,
      confirmedReservations: reservations.filter((r) => r.status === 'confirmed').length,
      completedReservations: reservations.filter((r) => r.status === 'completed').length,
      cancelledReservations: reservations.filter((r) => r.status === 'cancelled').length,
      revenue:               reservations
        .filter((r) => r.status !== 'cancelled')
        .reduce((s, r) => s + (Number(r.total) || 0), 0),
      newCustomers,
      unreadNotifs,
    }
  }, [cars, reservations, users, notifications])

  // ─── Chart data (6 derniers mois) ────────────────────────────────────────
  const chartData = useMemo(() => {
    const months = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months[key] = {
        label:   d.toLocaleDateString('fr-FR', { month: 'short' }),
        count:   0,
        revenue: 0,
      }
    }
    for (const r of reservations) {
      if (!r.created_at) continue
      const key = r.created_at.slice(0, 7)
      if (months[key]) {
        months[key].count += 1
        if (r.status !== 'cancelled') months[key].revenue += Number(r.total) || 0
      }
    }
    return Object.values(months)
  }, [reservations])

  // ─── Activity feed (12 dernières réservations) ────────────────────────────
  const activity = useMemo(() => {
    return [...reservations]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12)
      .map((r) => ({
        id:       r.id,
        type:     'reservation',
        title:    `${r.car_name || 'Véhicule'} — ${r.status}`,
        subtitle: r.customer_name || r.profiles?.full_name || 'Client',
        time:     r.created_at,
        status:   r.status,
      }))
  }, [reservations])

  const value = useMemo(
    () => ({
      reservations,
      setReservations,
      users,
      cars,
      setCars,
      notifications,
      loading,
      refreshing,
      error,
      stats,
      chartData,
      activity,
      refresh: () => refresh(false),
      refreshAll: () => refresh(false), // alias pour AvailabilityCalendar
      updateReservationLocally,
      removeReservationLocally,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      reservations, users, cars, notifications,
      loading, refreshing, error, stats, chartData, activity,
      refresh, updateReservationLocally, removeReservationLocally,
      markNotificationRead, markAllNotificationsRead,
    ],
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider')
  return ctx
}
