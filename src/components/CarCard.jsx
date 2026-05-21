import React, { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FiCheckCircle, FiSettings, FiUsers } from 'react-icons/fi'
import { BsFuelPump } from 'react-icons/bs'
import { useApp } from '../context/AppContext'
import LazyImage from './ui/LazyImage'

function CarCard({ car, delay = 0 }) {
  const { openBooking } = useApp()
  const handleReserve = useCallback(() => openBooking(car), [openBooking, car])

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: delay * 0.07, ease: [0.16,1,0.3,1] }}
      whileHover={{ y: -6 }}
      className="group overflow-hidden cursor-pointer h-full flex flex-col relative"
      style={{
        background: 'rgba(13,26,42,0.65)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top gold line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5), transparent)', opacity: 0.6 }} />

      {/* Image container */}
      <div className="relative flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(145deg, #0a1525, #070d18)', height: 260, borderRadius: '20px 20px 0 0' }}>
        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)', animation: 'none' }} />

        {/* Badge */}
        {car.badge && (
          <span className="absolute top-5 left-5 z-10 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-[1.5px] uppercase" style={{ background: '#C9A84C', color: '#080E18', fontFamily: 'Outfit, sans-serif' }}>
            {car.badge}
          </span>
        )}

        {/* Unavailable overlay */}
        {!car.available && (
          <span className="absolute inset-0 z-20 flex items-center justify-center text-[11px] font-bold uppercase tracking-[3px] text-red-400 backdrop-blur-sm" style={{ background: 'rgba(8,14,24,0.72)', fontFamily: 'Outfit, sans-serif' }}>
            Indisponible
          </span>
        )}

        {/* Year */}
        {car.year && (
          <span className="absolute bottom-4 right-5 z-10 text-[11px] font-medium tracking-[2px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit, sans-serif' }}>
            {car.year}
          </span>
        )}

        <LazyImage
          src={car.img}
          alt={car.name}
          className="object-contain transition-transform duration-600 group-hover:scale-[1.06]"
          style={{ width: '100%', height: 220, padding: 20, filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.7))' }}
        />
      </div>

      {/* Content */}
      <div className="p-7 flex flex-col flex-1">
        {/* Category */}
        <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2.5px]" style={{ color: '#C9A84C', fontFamily: 'Outfit, sans-serif' }}>
          {car.cat}
          <span className="h-px flex-1" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.2), transparent)' }} />
        </div>

        {/* Name */}
        <div className="font-display font-bold leading-tight mb-5 transition-colors group-hover:text-yellow-200" style={{ fontSize: '1.9rem', color: '#fff' }}>
          {car.name}
        </div>

        {/* Specs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <Spec icon={<FiUsers size={11} />} label={`${car.seats} places`} />
          <Spec icon={<BsFuelPump size={11} />} label={car.fuel} />
          <Spec icon={<FiSettings size={11} />} label={car.trans} />
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {car.specs?.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.05)', color: 'rgba(201,168,76,0.7)', border: '1px solid rgba(201,168,76,0.12)', fontFamily: 'Outfit, sans-serif' }}>
              <FiCheckCircle size={9} style={{ color: '#C9A84C' }} /> {s}
            </span>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-5 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <span className="font-condensed font-bold leading-none" style={{ fontSize: '2.7rem', color: '#C9A84C' }}>{car.price}</span>
            <span className="text-[12px] font-light ml-1" style={{ color: 'rgba(255,255,255,0.22)', fontFamily: 'Outfit, sans-serif' }}>DH/jour</span>
          </div>
          <button
            type="button"
            onClick={handleReserve}
            disabled={!car.available}
            className="text-[11px] font-bold uppercase tracking-[2px] px-6 py-3 rounded-xl border cursor-pointer transition-all duration-300"
            style={
              car.available
                ? { background: 'rgba(201,168,76,0.08)', color: '#C9A84C', borderColor: 'rgba(201,168,76,0.3)', fontFamily: 'Outfit, sans-serif' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.06)', cursor: 'not-allowed', fontFamily: 'Outfit, sans-serif' }
            }
            onMouseEnter={(e) => { if (car.available) { e.target.style.background = '#C9A84C'; e.target.style.color = '#080E18'; } }}
            onMouseLeave={(e) => { if (car.available) { e.target.style.background = 'rgba(201,168,76,0.08)'; e.target.style.color = '#C9A84C'; } }}
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
    <span className="flex items-center gap-1.5 text-[11px] font-medium rounded-full px-3 py-1.5" style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Outfit, sans-serif' }}>
      <span className="opacity-70">{icon}</span>
      {label}
    </span>
  )
}

export default memo(CarCard)
