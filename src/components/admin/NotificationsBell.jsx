/**
 * NotificationsBell.jsx
 * Admin realtime notification bell with dropdown
 */
import React, { useState, useRef, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'

const TYPE_ICON = { reservation: '📋', document: '📄', system: '⚙️' }

export default function NotificationsBell() {
  const { notifications, unreadCount, loading, markAllRead, markRead } = useAdminNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-gold/40 hover:text-gold"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0D1A2A] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-condensed text-xs font-bold uppercase tracking-[2px] text-white/60">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gold hover:text-gold/70"
                >
                  <Check size={11} /> Tout lire
                </button>
              )}
            </div>

            <div className="max-h-[340px] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-8 text-white/30 text-sm">
                  Chargement…
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="flex items-center justify-center py-8 text-white/30 text-sm">
                  Aucune notification
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex gap-3 border-b border-white/[0.04] px-4 py-3 transition cursor-pointer ${
                    n.read ? 'opacity-50' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="mt-0.5 text-base shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${n.read ? 'text-white/50' : 'text-white/90'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-white/35 truncate">{n.message}</p>
                    )}
                    <p className="mt-1 text-[10px] text-white/25">
                      {new Date(n.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
