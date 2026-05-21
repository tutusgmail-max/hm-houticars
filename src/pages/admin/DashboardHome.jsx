import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, CalendarCheck, Clock, DollarSign, Users, Plus, Download, ArrowRight, TrendingUp } from 'lucide-react'
import { useAdminData } from '../../context/AdminDataContext'
import StatCard from '../../components/admin/ui/StatCard'
import GlassCard from '../../components/admin/ui/GlassCard'
import SimpleBarChart from '../../components/admin/ui/SimpleBarChart'
import StatusBadge from '../../components/admin/ui/StatusBadge'

export default function DashboardHome() {
  const { stats, chartData, activity, reservations, loading } = useAdminData()
  const recent = reservations.slice(0, 6)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="h-28 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-[22px] font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Bonjour 👋</h2>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}>
            Voici un aperçu de votre activité aujourd'hui
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[12px]" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)', color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>
          <TrendingUp size={14} />
          Données en temps réel
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total véhicules" value={stats.totalCars} delay={0} />
        <StatCard icon={Car} label="Disponibles" value={stats.availableCars} accent="emerald" delay={50} />
        <StatCard icon={CalendarCheck} label="En location" value={stats.reservedCars} accent="blue" delay={100} />
        <StatCard icon={Clock} label="En attente" value={stats.pendingReservations} accent="amber" delay={150} />
        <StatCard icon={CalendarCheck} label="Réservations" value={stats.totalReservations} delay={200} />
        <StatCard icon={CalendarCheck} label="Confirmées" value={stats.confirmedReservations} accent="blue" delay={250} />
        <StatCard icon={DollarSign} label="Revenus estimés" value={`${stats.revenue?.toLocaleString() || 0} DH`} delay={300} />
        <StatCard icon={Users} label="Nouveaux clients" value={stats.newCustomers} accent="emerald" delay={350} />
      </div>

      {/* Charts + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <SimpleBarChart title="Réservations (6 mois)" data={chartData} valueKey="count" />
          <SimpleBarChart title="Revenus (6 mois)" data={chartData} valueKey="revenue" formatValue={(v) => `${v?.toLocaleString()} DH`} />
        </div>

        <div className="space-y-5">
          {/* Quick actions */}
          <GlassCard className="p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[2.5px] mb-4" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit, sans-serif' }}>Actions rapides</h3>
            <div className="space-y-2">
              {[
                { to: '/admin/fleet', icon: Plus, label: 'Ajouter un véhicule', accent: '#C9A84C' },
                { to: '/admin/reservations', icon: Clock, label: 'Réservations en attente', accent: '#FBBF24' },
                { to: '/admin/documents', icon: Download, label: 'Vérifier documents', accent: '#63B3ED' },
              ].map(({ to, icon: Icon, label, accent }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3.5 rounded-xl border transition-all text-[13px] font-semibold no-underline"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontFamily: 'Outfit, sans-serif' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}30`; e.currentTarget.style.background = `${accent}08` }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="p-1.5 rounded-lg" style={{ background: `${accent}12` }}>
                    <Icon size={15} style={{ color: accent }} />
                  </div>
                  {label}
                  <ArrowRight size={13} className="ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* Activity feed */}
          <GlassCard className="p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[2.5px] mb-4" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit, sans-serif' }}>Activité récente</h3>
            <ul className="space-y-0 max-h-64 overflow-y-auto">
              {activity.map((a, i) => (
                <li key={a.id} className="flex gap-3 py-3" style={{ borderBottom: i < activity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A84C' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white/85 truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>{a.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{a.subtitle}</p>
                    <p className="text-[10px] text-white/20 mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {a.time ? new Date(a.time).toLocaleString('fr-FR') : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      {/* Recent reservations table */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Dernières réservations</h3>
          <Link to="/admin/reservations" className="text-[12px] font-semibold no-underline flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>
            Voir tout <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Réf', 'Client', 'Véhicule', 'Dates', 'Statut', 'Total'].map((h) => (
                  <th key={h} className="pb-3 pr-4 text-left last:text-right font-semibold" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="admin-table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="py-3.5 pr-4 font-mono text-[12px]" style={{ color: '#C9A84C', fontFamily: 'DM Mono, monospace' }}>{r.ref}</td>
                  <td className="py-3.5 pr-4 font-medium text-white/80" style={{ fontFamily: 'Outfit, sans-serif' }}>{r.customer_name || r.profiles?.full_name || '—'}</td>
                  <td className="py-3.5 pr-4 text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>{r.car_name}</td>
                  <td className="py-3.5 pr-4 text-[11px] text-white/35" style={{ fontFamily: 'Outfit, sans-serif' }}>{r.start_date} → {r.end_date}</td>
                  <td className="py-3.5 pr-4"><StatusBadge status={r.status} /></td>
                  <td className="py-3.5 text-right font-bold" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>{r.total} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}
