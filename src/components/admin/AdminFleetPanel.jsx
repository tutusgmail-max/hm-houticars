import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import {
  fetchAllCars,
  createCar,
  updateCar,
  deleteCar,
  uploadCarImages,
} from '../../services/cars.service'
import { useApp } from '../../context/AppContext'
import { useCars } from '../../context/CarsContext'
import CarFormModal from './CarFormModal'
import LazyImage from '../ui/LazyImage'

export default function AdminFleetPanel() {
  const { addToast } = useApp()
  const { loadCars } = useCars()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, car: null })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCars(await fetchAllCars())
    } catch (err) {
      addToast(err?.message || 'Erreur chargement flotte', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      if (modal.car?.id) {
        const images = [...(payload.images || [])]
        if (payload.imageFiles?.length) {
          const uploaded = await uploadCarImages(modal.car.id, payload.imageFiles)
          images.push(...uploaded)
        }
        await updateCar(modal.car.id, {
          ...payload,
          images: images.length ? images : payload.images,
        })
      } else {
        const saved = await createCar(payload)
        if (payload.imageFiles?.length) {
          const uploaded = await uploadCarImages(saved.id, payload.imageFiles)
          await updateCar(saved.id, { ...saved, images: uploaded })
        }
      }
      addToast(modal.car ? 'Véhicule mis à jour' : 'Véhicule ajouté')
      setModal({ open: false, car: null })
      await load()
      await loadCars()
    } catch (err) {
      addToast(err?.message || 'Erreur enregistrement', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (car) => {
    if (!window.confirm(`Supprimer ${car.name} ?`)) return
    try {
      await deleteCar(car.id)
      addToast('Véhicule supprimé')
      await load()
      await loadCars()
    } catch (err) {
      addToast(err?.message || 'Suppression impossible', 'error')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="font-['Barlow_Condensed',sans-serif] font-black text-navy text-2xl">
          Gestion de la flotte
        </h2>
        <button
          type="button"
          onClick={() => setModal({ open: true, car: null })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy text-gold font-bold text-sm border border-gold/30 hover:bg-navy-mid transition-colors"
        >
          <FiPlus /> Ajouter un véhicule
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <motion.div key={i} className="h-64 rounded-2xl bg-white animate-pulse border border-black/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cars.map((car) => (
            <motion.div
              key={car.id}
              layout
              className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="h-40 bg-[#f0f2f5] flex items-center justify-center p-2">
                <LazyImage src={car.img} alt={car.name} className="h-full w-full" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-['Barlow_Condensed',sans-serif] font-black text-navy text-xl">
                      {car.name}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {car.cat} · {car.price} DH/j
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      car.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {car.available ? 'Dispo' : 'Indispo'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setModal({ open: true, car })}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-navy/5 text-navy text-xs font-bold hover:bg-navy/10"
                  >
                    <FiEdit2 /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(car)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CarFormModal
        open={modal.open}
        car={modal.car}
        saving={saving}
        onClose={() => setModal({ open: false, car: null })}
        onSave={handleSave}
      />
    </motion.div>
  )
}
