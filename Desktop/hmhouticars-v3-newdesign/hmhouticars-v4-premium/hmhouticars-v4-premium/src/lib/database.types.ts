// ============================================================
// HoutiCars — Database TypeScript Types (v3 app schema)
// Aligned with supabase-schema.sql + BookingModal.jsx payload
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProfileRole = 'client' | 'admin'
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: ProfileRole
  avatar_url: string | null
  identity_documents?: IdentityDocumentsPayload | null
  created_at: string
  updated_at: string
}

export interface IdentityDocumentEntry {
  path: string
  url: string
  uploaded_at: string
}

export interface IdentityDocumentsPayload {
  cin_recto?: IdentityDocumentEntry
  cin_verso?: IdentityDocumentEntry
  permis_recto?: IdentityDocumentEntry
  permis_verso?: IdentityDocumentEntry
  complete?: boolean
  updated_at?: string
}

export type UserDocumentType = 'cin_recto' | 'permis'

/** One row per document in public.user_documents */
export interface UserDocument {
  id: string
  user_id: string
  doc_type: UserDocumentType
  storage_path: string
  uploaded_at: string
}

/** DB row may use legacy names (reference, total_price) or v3 names (ref, total). */
export interface Reservation {
  id: string
  ref?: string
  reference?: string
  user_id: string | null
  car_id: number
  car_name: string
  car_price: number
  pickup_location?: string
  return_location?: string
  start_date: string
  end_date: string
  days: number
  total?: number
  total_price?: number
  payment_method: string
  notes: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  status: ReservationStatus
  documents?: Record<string, string | null>
  cin_front_url?: string | null
  cin_back_url?: string | null
  permis_front_url?: string | null
  permis_back_url?: string | null
  created_at: string
  updated_at?: string
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

export type ReservationInsert = Omit<Reservation, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
      }
      reservations: {
        Row: Reservation
        Insert: ReservationInsert
        Update: Partial<ReservationInsert>
      }
      user_documents: {
        Row: UserDocument
        Insert: Omit<UserDocument, 'id' | 'uploaded_at'> & { id?: string; uploaded_at?: string }
        Update: Partial<Omit<UserDocument, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface ReservationWithProfile extends Reservation {
  profiles: Pick<Profile, 'full_name' | 'email' | 'phone'> | null
}
