/**
 * useAdminNotifications.js
 * Real-time admin notification system via Supabase
 * Fetches unread notifications and subscribes to new ones.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) {
        if (error.code !== 'PGRST205' && error.code !== '42P01') {
          console.warn('[Notifications]', error.message)
        }
        setNotifications([])
        setUnreadCount(0)
        return
      }
      const list = data || []
      setNotifications(list)
      setUnreadCount(list.filter((n) => !n?.read).length)
    } catch {
      // Non-critical — keep bell usable
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const ch = supabase
      .channel('admin-notifications-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload?.new
          if (!row?.id) return
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev
            return [row, ...prev].slice(0, 30)
          })
          setUnreadCount((c) => c + 1)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchNotifications])

  const markAllRead = useCallback(async () => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('read', false)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }, [])

  const markRead = useCallback(async (id) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {}
  }, [])

  return { notifications, unreadCount, loading, markAllRead, markRead, refetch: fetchNotifications }
}
