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
  const [reservations, setReservations] = useState([])
  const [users, setUsers] = useState([])
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchingRef = useRef(false)
  const refreshDebounceRef = useRef(null)

  const refresh = useCallback(async (isInitial = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    if (isInitial) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const [resR, profR, fleetR] = await Promise.allSettled([
        getAllReservations(),
        getAllProfiles(),
        fetchAllCars(),
      ])

      if (resR.status === 'fulfilled') setReservations(resR.value)
      else {
        console.warn('[AdminData] reservations:', resR.reason?.message)
        setReservations([])
      }

      if (profR.status === 'fulfilled') setUsers(profR.value)
      else {
        console.warn('[AdminData] profiles:', profR.reason?.message)
        setUsers([])
      }

      if (fleetR.status === 'fulfilled') setCars(fleetR.value)
      else {
        console.warn('[AdminData] fleet:', fleetR.reason?.message)
        setCars([])
      }

      const failures = [resR, profR, fleetR].filter((r) => r.status === 'rejected')
      if (failures.length === 3) {
        setError(failures[0].reason?.message || 'Erreur chargement admin')
      }
    } catch (err) {
      setError(err?.message || 'Erreur chargement admin')
    } finally {
      fetchingRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    refreshDebounceRef.current = setTimeout(() => refresh(false), 400)
  }, [refresh])

  useEffect(() => {
    refresh(true)
    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
    }
  }, [refresh])

  useEffect(() => {
    const channel = supabase
      .channel('admin-reservations-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const mapped = mapRowToReservation(payload.new)
          setReservations((prev) => {
            if (prev.some((r) => r.id === mapped.id)) return prev
            return [mapped, ...prev]
          })
          return
        }
        scheduleRefresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [scheduleRefresh])

  const stats = useMemo(() => {
    const active = reservations.filter((r) => ['pending', 'confirmed'].includes(r.status))
    const reservedCarIds = new Set(active.map((r) => r.car_id).filter(Boolean))
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const newCustomers = users.filter(
      (u) => u.created_at && new Date(u.created_at).getTime() > thirtyDaysAgo,
    ).length

    return {
      totalCars: cars.length,
      availableCars: cars.filter((c) => c.available).length,
      reservedCars: reservedCarIds.size,
      totalReservations: reservations.length,
      pendingReservations: reservations.filter((r) => r.status === 'pending').length,
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
      months[key] = { label: d.toLocaleDateString('fr-FR', { month: 'short' }), count: 0, revenue: 0 }
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

  const activity = useMemo(() => {
    return [...reservations]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12)
      .map((r) => ({
        id: r.id,
        type: 'reservation',
        title: `${r.car_name || 'Véhicule'} — ${r.status}`,
        subtitle: r.customer_name || r.profiles?.full_name || 'Client',
        time: r.created_at,
        status: r.status,
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
      refreshing,
      error,
      stats,
      chartData,
      activity,
      refresh: () => refresh(false),
      refreshAll: () => refresh(false),
    }),
    [reservations, users, cars, loading, refreshing, error, stats, chartData, activity, refresh],
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider')
  return ctx
}
