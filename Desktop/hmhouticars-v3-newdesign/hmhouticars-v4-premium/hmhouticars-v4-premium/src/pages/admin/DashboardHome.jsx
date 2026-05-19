import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Car,
  CalendarCheck,
  Clock,
  DollarSign,
  Users,
  Plus,
  Download,
  ArrowRight,
} from 'lucide-react'
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total véhicules" value={stats.totalCars} delay={0} />
        <StatCard icon={Car} label="Disponibles" value={stats.availableCars} accent="emerald" delay={50} />
        <StatCard icon={CalendarCheck} label="En location" value={stats.reservedCars} accent="blue" delay={100} />
        <StatCard icon={Clock} label="En attente" value={stats.pendingReservations} accent="amber" delay={150} />
        <StatCard icon={CalendarCheck} label="Réservations" value={stats.totalReservations} delay={200} />
        <StatCard icon={CalendarCheck} label="Confirmées" value={stats.confirmedReservations} accent="blue" delay={250} />
        <StatCard
          icon={DollarSign}
          label="Revenus estimés"
          value={`${stats.revenue.toLocaleString()} DH`}
          delay={300}
        />
        <StatCard icon={Users} label="Nouveaux clients" value={stats.newCustomers} accent="emerald" delay={350} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SimpleBarChart
            title="Réservations (6 mois)"
            data={chartData}
            valueKey="count"
          />
          <SimpleBarChart
            title="Revenus (6 mois)"
            data={chartData}
            valueKey="revenue"
            formatValue={(v) => `${v.toLocaleString()} DH`}
          />
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/45 mb-4">Actions rapides</h3>
            <div className="space-y-2">
              {[
                { to: '/admin/fleet', icon: Plus, label: 'Ajouter un véhicule' },
                { to: '/admin/reservations', icon: Clock, label: 'Réservations en attente' },
                { to: '/admin/documents', icon: Download, label: 'Vérifier documents' },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5 transition-all text-sm font-semibold text-white/80"
                >
                  <Icon size={18} className="text-[#C9A84C]" />
                  {label}
                  <ArrowRight size={14} className="ml-auto opacity-40" />
                </Link>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/45 mb-4">Activité récente</h3>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm border-b border-white/5 pb-3 last:border-0">
                  <span className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white/90 font-medium truncate">{a.title}</p>
                    <p className="text-white/40 text-xs">{a.subtitle}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">
                      {a.time ? new Date(a.time).toLocaleString('fr-FR') : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/45">Dernières réservations</h3>
          <Link to="/admin/reservations" className="text-xs font-bold text-[#C9A84C] hover:underline">
            Voir tout →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-[11px] uppercase tracking-wider border-b border-white/10">
                <th className="pb-3 pr-4">Réf</th>
                <th className="pb-3 pr-4">Client</th>
                <th className="pb-3 pr-4">Véhicule</th>
                <th className="pb-3 pr-4">Dates</th>
                <th className="pb-3 pr-4">Statut</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-mono text-[#C9A84C]">{r.ref}</td>
                  <td className="py-3 pr-4">{r.customer_name || r.profiles?.full_name || '—'}</td>
                  <td className="py-3 pr-4">{r.car_name}</td>
                  <td className="py-3 pr-4 text-white/50 text-xs">
                    {r.start_date} → {r.end_date}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 text-right font-bold text-[#C9A84C]">{r.total} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}
