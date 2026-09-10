import { clearApiSession, getApiAccessToken, persistAuthTokens, readApiSession } from './auth-session'
import { supabase } from './supabase'

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiClientOptions = {
  baseUrl: string
  fetcher?: typeof fetch
  getAccessToken?: () => Promise<string | null>
}

function apiUrl(baseUrl: string, path: string): string {
  let base: URL
  try {
    if (!/^https?:\/\//i.test(baseUrl) || /[\s\\?#]/.test(baseUrl)
      || /^https?:\/\/[^/]*@/i.test(baseUrl)) throw new Error()
    base = new URL(baseUrl)
    if (!/^https?:$/.test(base.protocol) || base.username || base.password) throw new Error()
  } catch {
    throw new Error('VITE_API_BASE_URL 必须是绝对 HTTP(S) URL，且不得包含用户名密码、查询参数或片段')
  }

  let decoded = path
  while (true) {
    if (/[\\\u0000-\u0020\u007f]/.test(decoded)
      || /^\/?[a-z][a-z\d+.-]*:/i.test(decoded)
      || decoded.includes('//')
      || decoded.split(/[/?#]/).includes('..')) {
      throw new Error('API 请求路径必须是相对端点，不得包含协议、双斜线、反斜线或 .. 路径逃逸')
    }
    if (!/%[a-f\d]{2}/i.test(decoded)) break
    try {
      decoded = decodeURIComponent(decoded)
    } catch {
      throw new Error('API 请求路径包含无效的 URL 编码')
    }
  }

  const prefix = `${base.href.replace(/\/$/, '')}/`
  const url = new URL(path.replace(/^\//, ''), prefix)
  if (url.origin !== base.origin || !url.pathname.startsWith(new URL(prefix).pathname)) {
    throw new Error('API 请求路径不得超出配置的源或路径前缀')
  }
  return url.href
}

async function errorFrom(response: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }
  const payload = body as { error?: { message?: unknown; code?: unknown }; message?: unknown } | null
  const nested = payload?.error
  const message = typeof nested?.message === 'string'
    ? nested.message
    : typeof payload?.message === 'string'
      ? payload.message
      : `请求失败（${response.status}）`
  return new ApiError(message, response.status, typeof nested?.code === 'string' ? nested.code : undefined)
}

const unauthenticatedPaths = new Set(['/auth/login', '/auth/register', '/auth/refresh'])

async function defaultGetAccessToken(): Promise<string | null> {
  if (import.meta.env.VITE_DATA_PROVIDER?.trim().toLowerCase() === 'api') {
    return getApiAccessToken()
  }
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  return data.session?.access_token ?? null
}

export function createApiClient({ baseUrl, fetcher = fetch, getAccessToken = defaultGetAccessToken }: ApiClientOptions) {
  let refreshInFlight: Promise<boolean> | null = null

  async function refreshAccessToken(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = (async () => {
      const session = readApiSession()
      if (!session?.refreshToken) return false
      const url = apiUrl(baseUrl, '/auth/refresh')
      const response = await fetcher(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
      if (!response.ok) {
        clearApiSession()
        return false
      }
      const payload = await response.json() as {
        accessToken?: string
        refreshToken?: string
        user?: { id?: string; email?: string }
      }
      if (!payload.accessToken || !payload.refreshToken || !payload.user?.id || !payload.user.email) {
        clearApiSession()
        return false
      }
      persistAuthTokens({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: { id: payload.user.id, email: payload.user.email },
      })
      return true
    })()
    try {
      return await refreshInFlight
    } finally {
      refreshInFlight = null
    }
  }

  return async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    const url = apiUrl(baseUrl, path)
    const skipAuth = unauthenticatedPaths.has(path.replace(/\/$/, '') || path)
    const token = skipAuth ? null : await getAccessToken()
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetcher(url, { ...init, headers })
    if (response.status === 401 && !retried && !skipAuth && import.meta.env.VITE_DATA_PROVIDER?.trim().toLowerCase() === 'api') {
      const refreshed = await refreshAccessToken()
      if (refreshed) return request<T>(path, init, true)
    }
    if (!response.ok) throw await errorFrom(response)
    if (response.status === 204) return undefined as T
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
}
