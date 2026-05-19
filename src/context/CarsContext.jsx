import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchAvailableCars } from '../services/cars.service'
import { FALLBACK_CARS, getCarById as getFallbackCarById } from '../data'

const CarsContext = createContext(null)

function normalizePublicCars(rows = []) {
  return FALLBACK_CARS.map((fallback) => {
    const row = rows.find((car) => car.name?.toLowerCase() === fallback.name.toLowerCase())
    return row ? { ...fallback, ...row, price: fallback.price, fuel: fallback.fuel, img: fallback.img, available: row.available !== false } : fallback
  })
}

export function CarsProvider({ children }) {
  const [cars, setCars] = useState(FALLBACK_CARS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadCars = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAvailableCars()
      setCars(normalizePublicCars(data))
    } catch (err) {
      console.warn('[CarsContext]', err?.message)
      setError(err?.message || 'Impossible de charger la flotte')
      setCars(FALLBACK_CARS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCars()
  }, [loadCars])

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
