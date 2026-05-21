/**
 * Fail the build if Vite env does not target the canonical Supabase project.
 * Prevents Vercel from shipping a bundle wired to the wrong database.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_REF = 'ertdqfavrkomikszagtc'
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadDotEnv() {
  const path = resolve(root, '.env')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/)
    if (!m) continue
    out[m[1].trim()] = m[2].trim()
  }
  return out
}

function decodeJwtRef(token) {
  try {
    const payload = token.split('.')[1]
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)?.ref ?? null
  } catch {
    return null
  }
}

function refFromUrl(url) {
  try {
    const host = new URL(url).hostname
    return host.endsWith('.supabase.co') ? host.replace(/\.supabase\.co$/i, '') : null
  } catch {
    return null
  }
}

const fileEnv = loadDotEnv()
const url = (process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const key = (process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || '').trim()

if (!url || !key) {
  console.error('\n[build] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  console.error('Set them in Vercel → Settings → Environment Variables (Production + Preview), then redeploy.\n')
  process.exit(1)
}

const urlRef = refFromUrl(url)
const keyRef = decodeJwtRef(key)

if (urlRef !== EXPECTED_REF) {
  console.error(`\n[build] VITE_SUPABASE_URL points to "${urlRef}", expected "${EXPECTED_REF}".`)
  console.error('Vercel is likely still using the old project cmoioidgxealxfirkssc — update env vars and redeploy.\n')
  process.exit(1)
}

if (keyRef && keyRef !== EXPECTED_REF) {
  console.error(`\n[build] Anon key JWT ref is "${keyRef}", expected "${EXPECTED_REF}".`)
  console.error('Use the anon key from Supabase project ertdqfavrkomikszagtc (Settings → API).\n')
  process.exit(1)
}

console.log(`[build] Supabase env OK → ${EXPECTED_REF}`)
