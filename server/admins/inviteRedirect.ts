const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const

function trimOrigin(value: string | undefined): string | null {
  const origin = value?.trim().replace(/\/+$/, '')
  return origin ? origin : null
}

export function listInviteRedirectOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = [trimOrigin(env.APP_ORIGIN), trimOrigin(env.VITE_APP_ORIGIN)].filter(
    (item): item is string => Boolean(item),
  )
  return [...new Set([...configured, ...LOCAL_ORIGINS])]
}

export function resolveInviteRedirectTo(
  requestOrigin: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const allowed = listInviteRedirectOrigins(env)
  const origin = trimOrigin(requestOrigin)
  const chosen = origin && allowed.includes(origin) ? origin : allowed[0]
  return `${chosen}/set-password`
}
