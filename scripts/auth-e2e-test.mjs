/**
 * Automated Supabase Auth E2E (anon key only).
 * Usage: node scripts/auth-e2e-test.mjs
 * Loads .env from project root when present.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile() {
  const path = join(root, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/)
    if (!m) continue
    const k = m[1].trim()
    const v = m[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnvFile()

const url = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const anon = (process.env.VITE_SUPABASE_ANON_KEY || '').trim()

let failed = 0
const pass = (msg, detail = '') => console.log(`[PASS] ${msg}`, detail)
const fail = (msg, detail = '') => {
  console.error(`[FAIL] ${msg}`, detail)
  failed += 1
}

function decodeJwtRef(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return payload.ref || null
  } catch {
    return null
  }
}

console.log('\n=== HM Houti Cars — Auth E2E ===\n')

if (!url || !anon) {
  fail('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!url.startsWith('https://')) fail('URL must start with https://')
else pass('URL uses HTTPS', url)

const urlRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const keyRef = decodeJwtRef(anon)
if (!urlRef) fail('Invalid Supabase URL host')
else pass('URL project ref', urlRef)

if (keyRef && urlRef && keyRef !== urlRef) {
  fail('URL ref and anon JWT ref mismatch', { urlRef, keyRef })
} else {
  pass('URL and anon key match', keyRef || urlRef)
}

const email = `e2e-${Date.now()}@mailinator.com`
const password = '123456'

const client = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// 1. getSession
{
  const { error } = await client.auth.getSession()
  if (error) fail('getSession', error.message)
  else pass('getSession')
}

// 2. signUp
let userId = null
{
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: 'E2E Test', phone: '+212600000000' } },
  })
  if (error) {
    fail('signUp', `${error.message} (code=${error.code}, status=${error.status})`)
  } else if (data?.user?.identities?.length === 0) {
    fail('signUp', 'obfuscated user — email may already exist')
  } else if (!data?.user) {
    fail('signUp', 'no user returned')
  } else {
    userId = data.user.id
    pass('signUp', { userId, hasSession: !!data.session })
  }
}

// 3. signIn (session persistence)
let sessionAfterLogin = null
{
  await client.auth.signOut().catch(() => {})
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) fail('signIn', error.message)
  else if (!data?.session) fail('signIn', 'no session')
  else {
    sessionAfterLogin = data.session
    pass('signIn', { expires: data.session.expires_at })
  }
}

// 4. getSession after login
{
  const { data, error } = await client.auth.getSession()
  if (error) fail('getSession after login', error.message)
  else if (!data?.session?.access_token) fail('getSession after login', 'empty session')
  else pass('session persisted after login')
}

// 5. duplicate signUp → existing email behavior
{
  const dup = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await dup.auth.signUp({ email, password })
  if (error && /already|registered|rate/i.test(error.message)) {
    pass('duplicate signUp rejected', error.code || error.message)
  } else if (data?.user?.identities?.length === 0) {
    pass('duplicate signUp obfuscated user (email in use)')
  } else if (error) {
    pass('duplicate signUp error (acceptable)', error.message)
  } else {
    fail('duplicate signUp', 'unexpected success')
  }
}

// 6. signOut
{
  const { error } = await client.auth.signOut()
  if (error) fail('signOut', error.message)
  else pass('signOut')
}

// 7. public API (cars read)
{
  const { data, error } = await client.from('cars').select('id').limit(1)
  if (error) fail('cars select (RLS/connection)', error.message)
  else pass('cars anon read', `${data?.length ?? 0} row(s)`)
}

console.log('\n=== Summary ===')
if (failed === 0) {
  console.log('All auth E2E checks passed.')
  process.exit(0)
} else {
  console.error(`${failed} check(s) failed.`)
  process.exit(1)
}
