/**
 * Production Supabase audit — uses ONLY anon key (same as browser).
 * Never uses service_role.
 *
 * Usage (PowerShell, from project root):
 *   # load .env vars, then:
 *   node scripts/supabase-production-audit.mjs
 *
 * Optional:
 *   TEST_EMAIL / TEST_PASSWORD — login + reservation insert test
 *   TEST_SIGNUP_EMAIL — unique email for one signup test (will create user)
 */

import { createClient } from '@supabase/supabase-js'

const url = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const anon = (process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const testEmail = (process.env.TEST_EMAIL || '').trim()
const testPassword = (process.env.TEST_PASSWORD || '').trim()
const signupEmail = (process.env.TEST_SIGNUP_EMAIL || '').trim()

function fail(msg) {
  console.error('[FAIL]', msg)
  process.exitCode = 1
}

function ok(msg, detail) {
  console.log('[OK]', msg, detail ?? '')
}

if (!url || !anon) {
  fail('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1]
console.log('Project ref from URL:', ref || 'unknown')

const supabase = createClient(url, anon, { auth: { persistSession: false } })

// ─── 1. Anonymous: public cars read ─────────────────────────────────────────
{
  const { data, error } = await supabase.from('cars').select('id,name,available').limit(3)
  if (error) ok('cars (anon)', `blocked or missing: ${error.message}`)
  else ok('cars (anon)', `${data?.length ?? 0} rows`)
}

// ─── 2. Signup test (optional, ONE call) ────────────────────────────────────
if (signupEmail) {
  const pass = process.env.TEST_SIGNUP_PASSWORD || 'TestPass123!'
  const { data, error } = await supabase.auth.signUp({
    email: signupEmail,
    password: pass,
    options: { data: { full_name: 'Audit User', phone: '+212600000000' } },
  })
  if (error) fail(`signUp: ${error.message}`)
  else {
    ok('signUp', { userId: data.user?.id, hasSession: !!data.session })
    if (!data.session) {
      console.warn('[WARN] No session — turn OFF "Confirm email" in Supabase Auth settings')
    }
    await supabase.auth.signOut()
  }
} else {
  console.log('[SKIP] signUp (set TEST_SIGNUP_EMAIL to test once)')
}

// ─── 3. Login + RLS ─────────────────────────────────────────────────────────
if (!testEmail || !testPassword) {
  console.log('[SKIP] login/RLS (set TEST_EMAIL and TEST_PASSWORD)')
  process.exit(process.exitCode || 0)
}

const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
})
if (signInErr) fail(`signIn: ${signInErr.message}`)
const userId = signInData.user?.id
ok('signIn', { userId, hasSession: !!signInData.session })

const { data: prof, error: profErr } = await supabase
  .from('profiles')
  .select('id, role, email')
  .eq('id', userId)
  .single()
if (profErr) fail(`profiles SELECT: ${profErr.message}`)
else ok('profiles SELECT', prof)

const { data: avail, error: availErr } = await supabase
  .from('reservations')
  .select('id, car_id, status, start_date, end_date')
  .in('status', ['pending', 'confirmed'])
  .limit(5)
if (availErr) fail(`availability SELECT: ${availErr.message}`)
else ok('availability SELECT', `${avail?.length ?? 0} rows`)

const probe = {
  user_id: userId,
  car_id: 1,
  car_name: 'Audit Car',
  car_price: 300,
  start_date: '2026-12-01',
  end_date: '2026-12-03',
  days: 2,
  total: 600,
  customer_name: 'Audit',
  customer_phone: '+212600000000',
  status: 'pending',
}
const { data: ins, error: insErr } = await supabase
  .from('reservations')
  .insert(probe)
  .select('id, ref')
  .single()
if (insErr) fail(`reservation INSERT: ${insErr.message}`)
else {
  ok('reservation INSERT', ins)
  await supabase.from('reservations').delete().eq('id', ins.id)
  ok('reservation DELETE (cleanup)', ins.id)
}

await supabase.auth.signOut()
console.log(process.exitCode ? '[DONE with errors]' : '[DONE] All checks passed.')
