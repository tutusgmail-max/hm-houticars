/**
 * Diagnose Supabase Auth connectivity (anon key only).
 * Usage: node scripts/diagnose-supabase-auth.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = (process.env.VITE_SUPABASE_URL || '').trim()
const anon = (process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const testEmail = `diag-${Date.now()}@example.com`
const testPass = '123456'

if (!url || !anon) {
  console.error('[FAIL] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

console.log('URL:', url)
console.log('Ref:', url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '?')

const supabase = createClient(url, anon, { auth: { persistSession: false } })

const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
console.log('getSession:', sessionErr ? `ERR ${sessionErr.message}` : 'OK', !!sessionData?.session)

const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
  email: testEmail,
  password: testPass,
  options: { data: { full_name: 'Diag' } },
})

if (signUpErr) {
  console.error('[FAIL] signUp:', signUpErr.message, 'code:', signUpErr.code, 'status:', signUpErr.status)
  process.exit(1)
}

console.log('[OK] signUp:', {
  userId: signUpData.user?.id,
  hasSession: !!signUpData.session,
  identities: signUpData.user?.identities?.length ?? 0,
})
