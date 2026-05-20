import React, { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Eye, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  fetchAllCars,
  createCar,
  updateCar,
  deleteCar,
  uploadCarImages,
} from '../../services/cars.service'
import { useApp } from '../../context/AppContext'
import { useCars } from '../../context/CarsContext'
import { useAdminData } from '../../context/AdminDataContext'
import CarFormModal from './CarFormModal'
import AdminModal from './ui/AdminModal'
import LazyImage from '../ui/LazyImage'
import Pagination from './ui/Pagination'
import GlassCard from './ui/GlassCard'

const PAGE_SIZE = 6

export default function FleetManagement() {
  const { addToast } = useApp()
  const { loadCars } = useCars()
  const { cars: ctxCars, setCars: setCtxCars, refresh } = useAdminData()
  const [cars, setCars] = useState(ctxCars)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('all')
  const [trans, setTrans] = useState('all')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState({ open: false, car: null })
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAllCars()
      setCars(data)
      setCtxCars(data)
    } catch (err) {
      addToast(err?.message || 'Erreur flotte', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, setCtxCars])

  React.useEffect(() => {
    setCars(ctxCars)
  }, [ctxCars])

  React.useEffect(() => {
    if (!ctxCars.length) load()
  }, [ctxCars.length, load])

  const brands = useMemo(() => [...new Set(cars.map((c) => c.brand).filter(Boolean))], [cars])

  const filtered = useMemo(() => {
    return cars.filter((c) => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.brand?.toLowerCase().includes(q) ||
        c.cat?.toLowerCase().includes(q)
      const matchBrand = brand === 'all' || c.brand === brand
      const matchTrans = trans === 'all' || c.trans === trans
      return matchQ && matchBrand && matchTrans
    })
  }, [cars, search, brand, trans])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      if (modal.car?.id) {
        const images = [...(payload.images || [])]
        if (payload.imageFiles?.length) {
          images.push(...(await uploadCarImages(modal.car.id, payload.imageFiles)))
        }
        await updateCar(modal.car.id, { ...payload, images: images.length ? images : payload.images })
      } else {
        const saved = await createCar(payload)
        if (payload.imageFiles?.length) {
          const urls = await uploadCarImages(saved.id, payload.imageFiles)
          await updateCar(saved.id, { ...saved, images: urls })
        }
      }
      addToast(modal.car ? 'Véhicule mis à jour' : 'Véhicule créé')
      setModal({ open: false, car: null })
      await load()
      await loadCars()
      await refresh()
    } catch (err) {
      addToast(err?.message || 'Erreur', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (car) => {
    try {
      await updateCar(car.id, { ...car, available: !car.available })
      addToast(car.available ? 'Véhicule indisponible' : 'Véhicule disponible')
      await load()
      await loadCars()
    } catch {
      addToast('Erreur mise à jour', 'error')
    }
  }

  const handleDelete = async (car) => {
    if (!window.confirm(`Supprimer ${car.name} ?`)) return
    try {
      await deleteCar(car.id)
      addToast('Supprimé')
      await load()
      await loadCars()
    } catch {
      addToast('Suppression impossible', 'error')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-white/50 text-sm">{filtered.length} véhicule(s)</p>
        <button
          type="button"
          onClick={() => setModal({ open: true, car: null })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8C76A] text-[#0B1623] font-bold text-sm"
        >
          <Plus size={18} /> Ajouter
        </button>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#C9A84C]/40"
            />
          </div>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            <option value="all">Toutes marques</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={trans}
            onChange={(e) => {
              setTrans(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            <option value="all">Transmission</option>
            <option value="Manuelle">Manuelle</option>
            <option value="Automatique">Automatique</option>
          </select>
        </div>
      </GlassCard>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paged.map((car) => (
            <GlassCard key={car.id ?? `fleet-${car.name}`} hover className="overflow-hidden">
              <div className="h-44 bg-black/20 flex items-center justify-center p-2">
                <LazyImage src={car.img} alt={car.name} className="h-full w-full" />
              </div>
              <div className="p-5 space-y-3">
                <motion.div className="flex justify-between items-start gap-2">
                  <motion.div>
                    <h3 className="font-['Barlow_Condensed',sans-serif] text-xl font-black text-white">
                      {car.name}
                    </h3>
                    <p className="text-xs text-white/45">
                      {car.brand} · {car.cat} · {car.price} DH/j
                    </p>
                  </motion.div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      car.available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {car.available ? 'Dispo' : 'Off'}
                  </span>
                </motion.div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => toggleAvailable(car)}
                    className="flex items-center gap-1 text-xs font-bold text-white/60 hover:text-[#C9A84C]"
                  >
                    {car.available ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    Disponibilité
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { key: 'preview', icon: Eye, fn: () => setPreview(car) },
                    { key: 'edit', icon: Edit2, fn: () => setModal({ open: true, car }) },
                    { key: 'delete', icon: Trash2, fn: () => handleDelete(car) },
                  ].map(({ key, icon: Icon, fn }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={fn}
                      className="flex items-center justify-center py-2 rounded-lg bg-white/5 hover:bg-[#C9A84C]/15 text-white/70 hover:text-[#C9A84C] border border-white/10"
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <CarFormModal
        open={modal.open}
        car={modal.car}
        saving={saving}
        onClose={() => setModal({ open: false, car: null })}
        onSave={handleSave}
      />

      <AdminModal open={!!preview} onClose={() => setPreview(null)} title={preview?.name} wide>
        {preview && (
          <div className="space-y-4">
            <div className="h-56 flex items-center justify-center bg-black/30 rounded-xl">
              <LazyImage src={preview.img} alt={preview.name} className="max-h-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Marque', preview.brand],
                ['Catégorie', preview.cat],
                ['Prix', `${preview.price} DH/j`],
                ['Places', preview.seats],
                ['Carburant', preview.fuel],
                ['Transmission', preview.trans],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white/40 text-[10px] uppercase">{k}</p>
                  <p className="text-white font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminModal>
    </motion.div>
  )
}
