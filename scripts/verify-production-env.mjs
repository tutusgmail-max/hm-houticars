/**
 * Production safety check: build without local .env and confirm Supabase URL in output.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const expectedHost = 'ertdqfavrkomikszagtc.supabase.co'
const envPath = path.join(root, '.env')
const envBackup = path.join(root, '.env.verify-backup')

function restoreEnv() {
  if (fs.existsSync(envBackup)) {
    fs.renameSync(envBackup, envPath)
  }
}

let hadEnv = false
try {
  if (fs.existsSync(envPath)) {
    hadEnv = true
    fs.renameSync(envPath, envBackup)
  }

  const build = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  })
  if (build.status !== 0) {
    console.error('[verify-production-env] build failed')
    process.exit(build.status ?? 1)
  }

  const distDir = path.join(root, 'dist', 'assets')
  const chunks = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))
  let found = false
  for (const file of chunks) {
    const text = fs.readFileSync(path.join(distDir, file), 'utf8')
    if (text.includes(expectedHost)) {
      found = true
      break
    }
  }

  if (!found) {
    console.error(`[verify-production-env] expected host ${expectedHost} not found in dist bundle`)
    process.exit(1)
  }

  const wrongProject = 'cmoioidgxealxfirkssc'
  if (chunks.some((file) => fs.readFileSync(path.join(distDir, file), 'utf8').includes(wrongProject))) {
    console.error(`[verify-production-env] wrong Supabase project ref ${wrongProject} in bundle`)
    process.exit(1)
  }

  console.log('[verify-production-env] OK — production build includes Supabase project host')
} finally {
  if (hadEnv) restoreEnv()
}
