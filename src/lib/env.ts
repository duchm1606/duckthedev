// Env reader that works in both contexts: inside Astro/Vite builds
// (import.meta.env, .env already loaded) and plain node scripts (process.env).
export function env(key: string): string | undefined {
  const v =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) ??
    process.env[key]
  return v === '' ? undefined : v
}

export function requireEnv(key: string): string {
  const v = env(key)
  if (!v) throw new Error(`Missing environment variable ${key} — see .env.example`)
  return v
}

export const isProd = () => env('ENV_MODE') === 'prod'
