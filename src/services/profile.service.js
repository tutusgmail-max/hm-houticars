/**
 * profile.service.js
 * All profile-related Supabase calls in one place.
 */
import { supabase } from '../lib/supabase'

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfileData(userId, updates) {
  const payload = { ...updates, updated_at: new Date().toISOString() }
  let { error } = await supabase.from('profiles').update(payload).eq('id', userId)

  if (
    error &&
    updates.identity_documents &&
    (error.code === 'PGRST204' || /identity_documents|schema cache/i.test(error.message || ''))
  ) {
    throw new Error(
      'Colonne identity_documents absente. Exécutez la migration Supabase (20260520_fix_document_upload_and_storage.sql).',
    )
  }

  if (error) throw error
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`

  await updateProfileData(userId, { avatar_url: avatarUrl })
  return avatarUrl
}

export async function deleteUserAccount(userId) {
  await supabase.from('profiles').delete().eq('id', userId)
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
