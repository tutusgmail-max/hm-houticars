/**
 * Supabase smoke test for RLS policies.
 *
 * What it tests (authenticated user):
 * - SELECT own profile
 * - INSERT/UPDATE/SELECT/DELETE on public.user_documents where user_id = auth.uid()
 *
 * Usage:
 *   # from project root (final/)
 *   node scripts/supabase-smoke-test.mjs
 *
 * Required env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   TEST_EMAIL
 *   TEST_PASSWORD
 */

import { createClient } from '@supabase/supabase-js'

const url = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const anon = (process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const email = (process.env.TEST_EMAIL || '').trim()
const password = (process.env.TEST_PASSWORD || '').trim()

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.')
  process.exit(1)
}
if (!email || !password) {
  console.error('Missing TEST_EMAIL or TEST_PASSWORD in the environment.')
  process.exit(1)
}

const supabase = createClient(url, anon, { auth: { persistSession: false } })

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// 1) Sign in
const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
if (signInErr) throw signInErr

const userId = signInData.user?.id
assert(userId, 'No user id returned from sign-in.')

console.log('[OK] Signed in as:', userId)

// 2) Profile fetch
{
  const { data, error } = await supabase.from('profiles').select('id, role, email').eq('id', userId).single()
  if (error) throw error
  assert(data?.id === userId, 'Profile id mismatch.')
  console.log('[OK] Profile SELECT:', data)
}

// 3) user_documents CRUD
const docType = 'cin_front'
const marker = `smoke-${Date.now()}`
let rowId = null

// INSERT
{
  const { data, error } = await supabase
    .from('user_documents')
    .insert({
      user_id: userId,
      doc_type: docType,
      storage_path: `cin/${userId}/${marker}.jpg`,
    })
    .select('id,user_id,doc_type,storage_path')
    .single()
  if (error) throw error
  assert(data.user_id === userId, 'RLS INSERT returned wrong user_id.')
  rowId = data.id
  console.log('[OK] user_documents INSERT:', data)
}

// UPDATE
{
  const { data, error } = await supabase
    .from('user_documents')
    .update({ storage_path: `cin/${userId}/${marker}-updated.jpg` })
    .eq('id', rowId)
    .select('id,user_id,doc_type,storage_path')
    .single()
  if (error) throw error
  assert(data.user_id === userId, 'RLS UPDATE returned wrong user_id.')
  console.log('[OK] user_documents UPDATE:', data)
}

// SELECT
{
  const { data, error } = await supabase
    .from('user_documents')
    .select('id,user_id,doc_type,storage_path')
    .eq('id', rowId)
    .single()
  if (error) throw error
  assert(data.user_id === userId, 'RLS SELECT returned wrong user_id.')
  console.log('[OK] user_documents SELECT:', data)
}

// DELETE
{
  const { error } = await supabase.from('user_documents').delete().eq('id', rowId)
  if (error) throw error
  console.log('[OK] user_documents DELETE')
}

await supabase.auth.signOut()
console.log('[DONE] All checks passed.')

