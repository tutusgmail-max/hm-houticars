/**

 * profile.service.js

 * All profile-related Supabase calls in one place.

 */

import { supabase } from '../lib/supabase'

import { authSignOut } from './auth.service'

import { logAuthError } from '../utils/authDebug'

import { getMetadataRole } from '../utils/adminRole'



/**

 * Sync profiles.role when Auth metadata says admin but DB row is still client.

 */

async function syncProfileRoleFromMetadata(userId, profile, sessionUser) {

  const metaRole = getMetadataRole(sessionUser)

  if (metaRole !== 'admin' || profile?.role === 'admin') return profile



  const { data: updated, error } = await supabase

    .from('profiles')

    .update({ role: 'admin' })

    .eq('id', userId)

    .select('*')

    .single()



  if (!error && updated) return updated



  if (error) {
    logAuthError('profile.syncAdminRole', error)
    // Trigger may block self-promotion; UI still treats metadata admin via AuthContext.
  }
  return { ...profile, role: 'admin' }

}



/**

 * Fetch the profile row for the current user.

 */

export async function fetchProfile(userId, sessionUser = null) {

  const { data, error } = await supabase

    .from('profiles')

    .select('*')

    .eq('id', userId)

    .single()



  if (!error && data) {

    if (sessionUser) {

      return syncProfileRoleFromMetadata(userId, data, sessionUser)

    }

    return data

  }



  // PGRST116 = "No rows found" in PostgREST

  if ((error.code === 'PGRST116' || /0 rows|no rows/i.test(error.message || '')) && sessionUser) {

    try {

      const metaRole = getMetadataRole(sessionUser)

      const payload = {

        id: userId,

        email: sessionUser.email ?? null,

        full_name: sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.name ?? null,

        role: metaRole === 'admin' ? 'admin' : 'client',

      }

      const metaPhone = sessionUser.user_metadata?.phone

      if (metaPhone) payload.phone = metaPhone



      const { data: created, error: createErr } = await supabase

        .from('profiles')

        .insert(payload)

        .select('*')

        .single()



      if (!createErr) return created

      logAuthError('profile.insert', createErr)

    } catch (createEx) {

      logAuthError('profile.insert', createEx)

    }

  }



  logAuthError('profile.fetch', error)

  throw error

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

  await authSignOut()

}


