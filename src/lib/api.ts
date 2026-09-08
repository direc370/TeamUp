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
  const base = new URL(baseUrl)
  if (!/^https?:$/.test(base.protocol)) throw new Error('VITE_API_BASE_URL 必须是绝对 HTTP(S) URL')
  return new URL(path.replace(/^\//, ''), `${base.href.replace(/\/$/, '')}/`).href
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

export function createApiClient({ baseUrl, fetcher = fetch, getAccessToken = async () => {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }
  return data.session?.access_token ?? null
} }: ApiClientOptions) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getAccessToken()
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetcher(apiUrl(baseUrl, path), { ...init, headers })
    if (!response.ok) throw await errorFrom(response)
    if (response.status === 204) return undefined as T
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  }
}
