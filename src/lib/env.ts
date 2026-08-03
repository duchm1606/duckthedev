// Đọc env chạy được ở cả hai ngữ cảnh: trong Astro/Vite (import.meta.env,
// đã load .env) lẫn script node thuần (process.env).
export function env(key: string): string | undefined {
  const v =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) ??
    process.env[key]
  return v === '' ? undefined : v
}

export function requireEnv(key: string): string {
  const v = env(key)
  if (!v) throw new Error(`Thiếu biến môi trường ${key} — xem .env.example`)
  return v
}

export const isProd = () => env('ENV_MODE') === 'prod'
