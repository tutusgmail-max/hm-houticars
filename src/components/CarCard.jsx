import React, { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FiCheckCircle, FiSettings, FiUsers } from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../context/AppContext'
import { useAuth } from '../auth/AuthContext'
import LazyImage from './ui/LazyImage'

const BADGE_COLORS = {
  Populaire: { bg: '#C9A84C', text: '#0B1623' },
  Premium: { bg: '#C9A84C', text: '#0B1623' },
  '4x4': { bg: '#C9A84C', text: '#0B1623' },
  Prestige: { bg: '#C9A84C', text: '#0B1623' },
  Luxe: { bg: '#C9A84C', text: '#0B1623' },
  Nouveau: { bg: '#3B82F6', text: '#FFFFFF' },
}

function CarCard({ car, delay = 0 }) {
  const { openBooking, openAuth } = useApp()
  const { user } = useAuth()

  const handleReserve = useCallback(() => {
    if (!user) {
      openAuth('login')
      return
    }
    openBooking(car)
  }, [user, openAuth, openBooking, car])

  const badge = BADGE_COLORS[car.badge] || { bg: '#C9A84C', text: '#0B1623' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: delay * 0.08 }}
      whileHover={{ y: -8 }}
      className="group overflow-hidden cursor-pointer h-full flex flex-col relative"
      style={{
        background: 'rgba(13,26,42,0.6)',
        border: '1px solid rgba(255,255,255,0.04)',
        boxShadow: 'none',
        transition: 'all 0.3s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d1a2a, #0a1422)', height: 260 }}
      >
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.12)_45%,transparent_58%)] translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-1000" />
        {car.badge && (
          <span
            className="absolute top-5 left-5 z-10 font-condensed text-[10px] font-bold px-3.5 py-1.5 rounded-sm tracking-[2px] uppercase shadow-lg"
            style={{ background: badge.bg, color: badge.text }}
          >
            {car.badge}
          </span>
        )}
        {!car.available && (
          <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#080E18]/70 text-[12px] font-condensed font-bold uppercase tracking-[3px] text-red-400 backdrop-blur-sm">
            Indisponible
          </span>
        )}
        {car.year && (
          <span
            className="absolute bottom-4 right-5 z-10 font-condensed text-[11px] font-bold tracking-[2px]"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {car.year}
          </span>
        )}
        <LazyImage
          src={car.img}
          alt={car.name}
          className="object-contain transition-transform duration-500 group-hover:scale-105"
          style={{ width: '100%', height: 220, padding: 20, filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.6))' }}
        />
      </div>

      <div className="p-7 flex flex-col flex-1">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2.5px]" style={{ color: '#C9A84C' }}>
          {car.cat}
          <span className="h-px flex-1 bg-gold/15" />
        </div>
        <div className="font-condensed font-black text-[1.9rem] leading-none mb-5 transition-colors group-hover:text-gold-light" style={{ color: '#FFFFFF' }}>
          {car.name}
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          <Spec icon={<FiUsers />} label={`${car.seats} places`} />
          <Spec icon={<BsFuelPump />} label={car.fuel} />
          <Spec icon={<FiSettings />} label={car.trans} />
        </div>

        <div className="flex gap-1.5 flex-wrap mb-5">
          {car.specs?.slice(0, 1).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-sm"
              style={{ background: 'rgba(201,168,76,0.04)', color: 'rgba(201,168,76,0.75)', border: '1px solid rgba(201,168,76,0.12)' }}
            >
              <FiCheckCircle style={{ color: '#C9A84C' }} /> {s}
            </span>
          ))}
          {car.specs?.slice(1).map((s) => (
            <span
              key={s}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-sm"
              style={{ background: 'rgba(201,168,76,0.04)', color: 'rgba(201,168,76,0.65)', border: '1px solid rgba(201,168,76,0.12)' }}
            >
              {s}
            </span>
          ))}
        </div>

        <div
          className="flex items-center justify-between pt-4 mt-auto"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="font-condensed">
            <span className="font-black leading-none" style={{ fontSize: '2.6rem', color: '#C9A84C' }}>
              {car.price}
            </span>
            <span className="text-[12px] font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {' '}
              DH/jour
            </span>
          </div>
          <button
            type="button"
            onClick={handleReserve}
            disabled={!car.available}
            className="font-condensed font-extrabold text-[12px] uppercase tracking-[2px] px-6 py-3 rounded-sm border cursor-pointer transition-all duration-300"
            style={
              car.available
                ? { background: 'transparent', color: '#C9A84C', borderColor: 'rgba(201,168,76,0.4)' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.08)', cursor: 'not-allowed' }
            }
          >
            Réserver →
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function Spec({ icon, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5" style={{ color: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[12px] opacity-60">
        {icon}
      </span>
      {label}
    </span>
  )
}

export default memo(CarCard)


