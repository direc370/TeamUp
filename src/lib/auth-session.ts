export const API_SESSION_KEY = 'saiban:api-session'

export type ApiAuthUser = {
  id: string
  email: string
}

export type ApiSession = {
  accessToken: string
  refreshToken: string
  user: ApiAuthUser
}

export type AppSession = {
  user: ApiAuthUser
}

const listeners = new Set<(session: ApiSession | null) => void>()

function isApiSession(value: unknown): value is ApiSession {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const user = record.user
  return typeof record.accessToken === 'string'
    && typeof record.refreshToken === 'string'
    && !!user && typeof user === 'object'
    && typeof (user as ApiAuthUser).id === 'string'
    && typeof (user as ApiAuthUser).email === 'string'
}

export function readApiSession(): ApiSession | null {
  try {
    const raw = localStorage.getItem(API_SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isApiSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeApiSession(session: ApiSession): void {
  localStorage.setItem(API_SESSION_KEY, JSON.stringify(session))
  listeners.forEach((listener) => listener(session))
}

export function clearApiSession(): void {
  localStorage.removeItem(API_SESSION_KEY)
  listeners.forEach((listener) => listener(null))
}

export function getApiAccessToken(): string | null {
  return readApiSession()?.accessToken ?? null
}

export function subscribeApiSession(listener: (session: ApiSession | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function persistAuthTokens(payload: {
  accessToken: string
  refreshToken: string
  user: ApiAuthUser
}): ApiSession {
  const session: ApiSession = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
  }
  writeApiSession(session)
  return session
}
