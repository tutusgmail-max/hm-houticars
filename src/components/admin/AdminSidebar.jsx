import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  CalendarDays,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react'

const NAV = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/admin/fleet', label: 'Flotte', icon: Car },
  { to: '/admin/calendar', label: 'Calendrier', icon: CalendarDays },
  { to: '/admin/reservations', label: 'Réservations', icon: FileText },
  { to: '/admin/documents', label: 'Documents', icon: FileText },
  { to: '/admin/customers', label: 'Clients', icon: Users },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export default function AdminSidebar({ collapsed = false, onToggle, onNavigate }) {
  return (
    <aside
      className={`fixed left-0 top-0 z-[300] h-full flex flex-col border-r border-white/10 bg-[#070d14]/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] flex items-center justify-center font-black text-[#0B1623] shrink-0">
          HM
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-['Barlow_Condensed',sans-serif] font-black text-white text-lg leading-tight">
              HM HOUTI
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[#C9A84C]/80">Admin Panel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/25'
                  : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5"
        >
          <ExternalLink size={18} />
          {!collapsed && 'Voir le site'}
        </a>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 text-xs"
        >
          <ChevronLeft size={16} className={collapsed ? 'rotate-180' : ''} />
          {!collapsed && 'Réduire'}
        </button>
      </div>
    </aside>
  )
}
