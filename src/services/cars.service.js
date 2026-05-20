/**
 * cars.service.js — Fleet CRUD + image uploads (Supabase)
 */
import { supabase } from '../lib/supabase'
import { compressImage } from '../utils/compressImage'

const IMAGE_BUCKET = 'image'
const CAR_IMAGE_PREFIX = 'houti cars'

export function mapCarRow(row) {
  if (!row) return null
  const images = Array.isArray(row.images) ? row.images : []
  return {
    id: row.id,
    name: row.name,
    brand: row.brand || '',
    year: row.year || '2024',
    cat: row.category || 'Citadine',
    price: Number(row.price_per_day ?? row.price ?? 0) || 0,
    seats: row.seats ?? 5,
    fuel: row.fuel || 'Essence',
    trans: row.transmission || 'Manuelle',
    img: images[0] || '',
    images,
    available: row.available !== false,
    badge: row.badge || null,
    specs: Array.isArray(row.specs) ? row.specs : [],
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function carToDbPayload(car) {
  return {
    name: car.name,
    brand: car.brand || car.name?.split(' ')[0] || '',
    year: car.year || '2024',
    category: car.cat || car.category || 'Citadine',
    price_per_day: Number(car.price ?? car.price_per_day),
    transmission: car.trans || car.transmission || 'Manuelle',
    fuel: car.fuel || 'Essence',
    seats: Number(car.seats) || 5,
    available: car.available !== false,
    images: car.images?.length ? car.images : car.img ? [car.img] : [],
    badge: car.badge || null,
    specs: car.specs || [],
    sort_order: car.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }
}

/** Public fleet (available only) */
export async function fetchAvailableCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('available', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error
  return (data || []).map(mapCarRow)
}

/** Admin: all cars */
export async function fetchAllCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error
  return (data || []).map(mapCarRow)
}

export async function fetchCarById(carId) {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('id', carId)
    .maybeSingle()

  if (error) throw error
  return mapCarRow(data)
}

export async function createCar(car) {
  const payload = carToDbPayload(car)
  const { data, error } = await supabase.from('cars').insert(payload).select().single()
  if (error) throw error
  return mapCarRow(data)
}

export async function updateCar(id, car) {
  const payload = carToDbPayload(car)
  const { data, error } = await supabase
    .from('cars')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapCarRow(data)
}

export async function deleteCar(id) {
  const { error } = await supabase.from('cars').delete().eq('id', id)
  if (error) throw error
}

export async function uploadCarImage(carId, file) {
  const compressed = await compressImage(file)
  const ext = 'jpg'
  const path = `${CAR_IMAGE_PREFIX}/${carId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(path, compressed, {
    cacheControl: '31536000',
    upsert: false,
    contentType: 'image/jpeg',
  })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadCarImages(carId, files) {
  const urls = []
  for (const file of files) {
    if (file instanceof File) urls.push(await uploadCarImage(carId, file))
  }
  return urls
}
