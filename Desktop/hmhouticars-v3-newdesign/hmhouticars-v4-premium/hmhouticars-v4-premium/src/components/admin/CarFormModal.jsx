import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import ImageDropzone from './ImageDropzone'
import { CAR_CATEGORIES } from '../../data'

const LABEL = 'block text-[10px] font-bold uppercase tracking-widest text-[#8A95A5] mb-1.5'
const INPUT =
  'w-full bg-[#1E3353] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#C9A84C]/50'

const emptyCar = {
  name: '',
  brand: '',
  year: '2024',
  cat: 'Citadine',
  price: 200,
  seats: 5,
  fuel: 'Essence',
  trans: 'Manuelle',
  available: true,
  badge: '',
  specs: '',
  images: [],
}

export default function CarFormModal({ open, car, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyCar)
  const [imageFiles, setImageFiles] = useState([])

  useEffect(() => {
    if (!open) return
    if (car) {
      setForm({
        ...emptyCar,
        ...car,
        specs: Array.isArray(car.specs) ? car.specs.join(', ') : '',
        badge: car.badge || '',
      })
    } else {
      setForm(emptyCar)
    }
    setImageFiles([])
  }, [open, car])

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const specs = form.specs
      ? form.specs.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    onSave({
      ...form,
      price: Number(form.price),
      seats: Number(form.seats),
      specs,
      imageFiles,
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0B1623] border border-[#C9A84C]/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#0B1623] z-10">
              <h2 className="font-['Barlow_Condensed',sans-serif] text-2xl font-black text-white">
                {car ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
              </h2>
              <button type="button" onClick={onClose} className="text-white/60 hover:text-white p-2">
                <FiX size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom" value={form.name} onChange={(v) => upd('name', v)} required />
                <Field label="Marque" value={form.brand} onChange={(v) => upd('brand', v)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Année" value={form.year} onChange={(v) => upd('year', v)} />
                <div>
                  <label className={LABEL}>Catégorie</label>
                  <select
                    value={form.cat}
                    onChange={(e) => upd('cat', e.target.value)}
                    className={INPUT}
                  >
                    {CAR_CATEGORIES.filter((c) => c !== 'Tous').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Prix / jour (DH)"
                  type="number"
                  value={form.price}
                  onChange={(v) => upd('price', v)}
                  required
                />
                <Field label="Places" type="number" value={form.seats} onChange={(v) => upd('seats', v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Carburant" value={form.fuel} onChange={(v) => upd('fuel', v)} />
                <Field label="Transmission" value={form.trans} onChange={(v) => upd('trans', v)} />
              </div>
              <Field label="Badge (optionnel)" value={form.badge} onChange={(v) => upd('badge', v)} />
              <Field
                label="Équipements (séparés par virgule)"
                value={form.specs}
                onChange={(v) => upd('specs', v)}
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => upd('available', e.target.checked)}
                  className="accent-[#C9A84C] w-4 h-4"
                />
                <span className="text-sm text-white">Disponible à la location</span>
              </label>

              {(form.images?.length > 0 || car?.img) && (
                <div className="flex gap-2 flex-wrap">
                  {(form.images?.length ? form.images : [car?.img])
                    .filter(Boolean)
                    .map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="w-20 h-14 object-cover rounded-lg border border-white/10"
                      />
                    ))}
                </div>
              )}

              <ImageDropzone
                files={imageFiles}
                onChange={setImageFiles}
                previews={(form.images?.length ? form.images : car?.img ? [car.img] : []).filter(Boolean)}
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl font-bold text-[#0B1623] bg-gradient-to-r from-[#C9A84C] to-[#E8C76A] disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : car ? 'Mettre à jour' : 'Créer le véhicule'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </div>
  )
}
