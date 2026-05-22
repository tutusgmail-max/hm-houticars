/**
 * Routes Supabase email links (recovery, confirm) and applies hash tokens safely.
 */
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  consumeAuthHashFromUrl,
  getAuthHashParams,
  hasAuthHashInUrl,
  isRecoveryHash,
} from '../utils/authUrl'

export default function AuthHashRouter() {
  const location = useLocation()
  const navigate = useNavigate()
  const consumingRef = useRef(false)

  useEffect(() => {
    if (!hasAuthHashInUrl()) return

    if (isRecoveryHash() && location.pathname !== '/reset-password') {
      navigate(`/reset-password${location.hash}`, { replace: true })
      return
    }

    const params = getAuthHashParams()
    if (params.error || params.error_description) return

    if (consumingRef.current) return
    consumingRef.current = true

    consumeAuthHashFromUrl(supabase)
      .then((result) => {
        if (!result.ok) return
        if (result.type === 'recovery' && location.pathname !== '/reset-password') {
          navigate('/reset-password', { replace: true })
        }
      })
      .finally(() => {
        consumingRef.current = false
      })
  }, [location.pathname, location.hash, navigate])

  return null
}
