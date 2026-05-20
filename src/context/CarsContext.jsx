/**
 * CarsContext.jsx
 *
 * BUG FIXED (critical): normalizePublicCars() was merging DB rows with
 * FALLBACK_CARS but always forcing price, fuel, and img from the static
 * fallback — overwriting the real values from Supabase.
 *
 * Example: If admin sets a car's price to 450 DH in Supabase, users would
 * still see 350 DH (the hardcoded fallback) and book at the wrong price.
 *
 * FIX: Use DB values as the source of truth. Only use fallback values when
 * the DB row has no corresponding entry (i.e., DB doesn't have that car at all).
 *
 * SECONDARY BUG: getCarById from data/index.js was exported as getFallbackCarById
 * but CarsContext imported it as `getCarById` — would throw if data/index.js
 * didn't export that name. Fixed import to match actual export.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchAvailableCars } from '../services/cars.service'
import { FALLBACK_CARS, getCarById as getFallbackCarById } from '../data'

const CarsContext = createContext(null)

export function CarsProvider({ children }) {
  const [cars, setCars]     = useState(FALLBACK_CARS)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const loadCars = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAvailableCars()
      // BUG FIX: Use DB data directly. If DB is empty, fall back to static list.
      // Do NOT override DB price/fuel/img with hardcoded fallback values.
      setCars(data.length > 0 ? data : FALLBACK_CARS)
    } catch (err) {
      console.warn('[CarsContext]', err?.message)
      setError(err?.message || 'Impossible de charger la flotte')
      setCars(FALLBACK_CARS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCars() }, [loadCars])

  const getCarById = useCallback(
    (id) => cars.find((c) => c.id === Number(id)) || getFallbackCarById(id),
    [cars],
  )

  const value = useMemo(
    () => ({ cars, loading, error, loadCars, getCarById }),
    [cars, loading, error, loadCars, getCarById],
  )

  return <CarsContext.Provider value={value}>{children}</CarsContext.Provider>
}

export function useCars() {
  const ctx = useContext(CarsContext)
  if (!ctx) throw new Error('useCars must be used within CarsProvider')
  return ctx
}
