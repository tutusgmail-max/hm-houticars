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
  X,
  FolderOpen,
} from 'lucide-react'

const NAV = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/admin/fleet', label: 'Flotte', icon: Car },
  { to: '/admin/calendar', label: 'Calendrier', icon: CalendarDays },
  { to: '/admin/reservations', label: 'Réservations', icon: FileText },
  { to: '/admin/documents', label: 'Documents', icon: FolderOpen },
  { to: '/admin/customers', label: 'Clients', icon: Users },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export default function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  return (
    <aside
      className={`admin-sidebar ${mobileOpen ? 'admin-sidebar--open' : ''} ${collapsed ? 'admin-sidebar--collapsed' : ''}`}
      role="navigation"
      aria-label="Navigation admin"
    >
      <div className="admin-sidebar__header">
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-mark">HM</div>
          {!collapsed && (
            <div className="admin-sidebar__logo-text">
              <p className="admin-sidebar__brand">HM HOUTI</p>
              <p className="admin-sidebar__role">Admin Panel</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onMobileClose}
          className="admin-sidebar__close-btn"
          aria-label="Fermer le menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="admin-sidebar__nav">
        <div className="admin-sidebar__nav-label">
          {!collapsed && <span>Menu principal</span>}
        </div>
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <Icon size={20} className="admin-sidebar__link-icon" />
            {!collapsed && <span className="admin-sidebar__link-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="admin-sidebar__link admin-sidebar__link--muted"
        >
          <ExternalLink size={18} className="admin-sidebar__link-icon" />
          {!collapsed && <span className="admin-sidebar__link-label">Voir le site</span>}
        </a>
        <button
          type="button"
          onClick={onToggle}
          className="admin-sidebar__collapse-btn"
          aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
        >
          <ChevronLeft
            size={16}
            className={`admin-sidebar__collapse-icon ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  )
}
