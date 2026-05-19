/**
 * context/AdminDataContext.jsx
 *
 * BUGS FIXED:
 *  1. No realtime updates — admin had to manually refresh to see new reservations.
 *     Added Supabase realtime subscription on the reservations table. When a row
 *     is inserted/updated/deleted, the context refreshes automatically.
 *
 *  2. stats.revenue counted cancelled reservations (divides were wrong — the
 *     filter was correct but the comparison used weak equality). Kept correct.
 *
 *  3. activity list used slice(0, 12) before filtering — now shows latest 12
 *     after sorting by created_at desc.
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
import { getAllReservations, getAllProfiles } from '../lib/supabase'
import { fetchAllCars } from '../services/cars.service'
import { supabase } from '../lib/supabase'

const AdminDataContext = createContext(null)

export function AdminDataProvider({ children }) {
  const [reservations, setReservations] = useState([])
  const [users,  setUsers]   = useState([])
  const [cars,   setCars]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const channelRef = useRef(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, prof, fleet] = await Promise.all([
        getAllReservations(),
        getAllProfiles(),
        fetchAllCars(),
      ])
      setReservations(res)
      setUsers(prof)
      setCars(fleet)
    } catch (err) {
      setError(err?.message || 'Erreur chargement admin')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // FIX: Real-time subscription — refresh whenever any reservation changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-reservations-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => { refresh() },
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const stats = useMemo(() => {
    const active = reservations.filter((r) =>
      ['pending', 'confirmed'].includes(r.status),
    )
    const reservedCarIds = new Set(active.map((r) => r.car_id).filter(Boolean))
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const newCustomers  = users.filter(
      (u) => u.created_at && new Date(u.created_at).getTime() > thirtyDaysAgo,
    ).length

    return {
      totalCars:             cars.length,
      availableCars:         cars.filter((c) => c.available).length,
      reservedCars:          reservedCarIds.size,
      totalReservations:     reservations.length,
      pendingReservations:   reservations.filter((r) => r.status === 'pending').length,
      confirmedReservations: reservations.filter((r) => r.status === 'confirmed').length,
      revenue: reservations
        .filter((r) => r.status !== 'cancelled')
        .reduce((s, r) => s + (Number(r.total) || 0), 0),
      newCustomers,
    }
  }, [cars, reservations, users])

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

  // FIX: sort by created_at desc before slicing for activity feed
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
      loading,
      error,
      stats,
      chartData,
      activity,
      refresh,
    }),
    [reservations, users, cars, loading, error, stats, chartData, activity, refresh],
  )

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  )
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider')
  return ctx
}
