import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './api'
import { mapApiProject, selectDataProvider } from './repository'

describe('API 客户端', () => {
  it('附加认证令牌并使用绝对 API 地址', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const request = createApiClient({
      baseUrl: 'https://api.example.com/api/v1/',
      fetcher: fetcher as typeof fetch,
      getAccessToken: async () => 'token-123',
    })

    await request('/projects')

    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/projects')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-123')
  })

  it('解析后端统一错误消息', async () => {
    const request = createApiClient({
      baseUrl: 'https://api.example.com/api/v1/',
      fetcher: async () => new Response(JSON.stringify({ error: { message: '项目不存在', code: 'NOT_FOUND' } }), { status: 404 }),
      getAccessToken: async () => null,
    })

    await expect(request('/projects/missing')).rejects.toMatchObject({
      message: '项目不存在',
      status: 404,
      code: 'NOT_FOUND',
    })
  })
})

describe('API 地址与响应回归', () => {
  const dangerousBases = [
    '', '/api/v1', '//api.example.com/api/v1', 'ftp://api.example.com/api/v1',
    'javascript:alert(1)', 'https://user:password@api.example.com/api/v1',
    'https://user@api.example.com/api/v1', 'https://api.example.com/api/v1?debug=1',
    'https://api.example.com/api/v1#section', 'https://api.example.com/api/v1?',
    'https://api.example.com/api/v1#', 'https://@api.example.com/api/v1',
  ]
  const dangerousPaths = [
    'https://other.example/projects', 'http://other.example/projects',
    'ftp://other.example/projects', '//other.example/projects', '///other.example/projects',
    '\\projects', 'projects\\secret', '../secret', '/projects/../secret',
    'projects/..', '%2e%2e/secret', '/projects/%2E%2E/secret',
    '%252e%252e/secret', '%2f%2fother.example/projects', '%5csecret',
    'projects/%2e%2e%2fsecret', 'projects/%252e%252e%252fsecret',
  ]

  async function expectRejectedBeforeSideEffects(baseUrl: string, path: string) {
    const getAccessToken = vi.fn(async () => 'private-token')
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }))
    const execute = async () => {
      const request = createApiClient({ baseUrl, fetcher, getAccessToken })
      await request(path)
    }

    await expect(execute()).rejects.toThrow()
    expect(getAccessToken).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  }

  it.each(dangerousBases)('危险 base 在 token/fetch 前拒绝：%s', async (baseUrl) => {
    await expectRejectedBeforeSideEffects(baseUrl, '/projects')
  })

  it.each(dangerousPaths)('危险 path 在 token/fetch 前拒绝：%s', async (path) => {
    await expectRejectedBeforeSideEffects('https://api.example.com/api/v1', path)
  })

  it.each([
    ['https://api.example.com/api/v1/', '/projects', 'https://api.example.com/api/v1/projects'],
    ['https://api.example.com/api/v1', 'projects', 'https://api.example.com/api/v1/projects'],
    ['http://localhost:3000/api/v1', '/projects', 'http://localhost:3000/api/v1/projects'],
  ])('合法地址 %s 与端点 %s 正常请求', async (baseUrl, path, expectedUrl) => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{"ok":true}'))
    const request = createApiClient({ baseUrl, fetcher, getAccessToken: async () => null })

    await expect(request(path)).resolves.toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe(expectedUrl)
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
  })

  it('POST JSON 保留方法、请求体及自定义头并设置 JSON headers', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{"id":"project-1"}', { status: 201 }))
    const request = createApiClient({ baseUrl: 'https://api.example.com/api/v1', fetcher, getAccessToken: async () => null })
    const body = JSON.stringify({ title: '测试项目' })

    await expect(request('/projects', { method: 'POST', body, headers: { 'X-Request-ID': 'qa-1' } })).resolves.toEqual({ id: 'project-1' })
    const init = fetcher.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(body)
    const headers = new Headers(init?.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Request-ID')).toBe('qa-1')
    expect(headers.has('Authorization')).toBe(false)
  })

  it('204 返回 undefined 且不尝试解析响应体', async () => {
    const response = new Response(null, { status: 204 })
    const text = vi.spyOn(response, 'text')
    const json = vi.spyOn(response, 'json')
    const request = createApiClient({ baseUrl: 'https://api.example.com/api/v1', fetcher: async () => response, getAccessToken: async () => null })

    await expect(request('/projects/project-1', { method: 'DELETE' })).resolves.toBeUndefined()
    expect(text).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
  })

  it.each([401, 502])('非 JSON 错误保留 HTTP status：%s', async (status) => {
    const request = createApiClient({
      baseUrl: 'https://api.example.com/api/v1',
      fetcher: async () => new Response('<html>请求失败</html>', { status, headers: { 'Content-Type': 'text/html' } }),
      getAccessToken: async () => null,
    })

    await expect(request('/projects')).rejects.toMatchObject({ name: 'ApiError', status })
  })

  it('网络失败原样抛出，不返回伪成功且不重试', async () => {
    const failure = new TypeError('网络连接失败')
    const fetcher = vi.fn(async () => { throw failure })
    const request = createApiClient({ baseUrl: 'https://api.example.com/api/v1', fetcher, getAccessToken: async () => null })

    await expect(request('/projects')).rejects.toBe(failure)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('数据提供者与映射', () => {
  it('默认优先使用已配置的 Supabase', () => {
    expect(selectDataProvider(undefined, true)).toBe('supabase')
    expect(selectDataProvider(undefined, false)).toBe('local')
    expect(selectDataProvider('api', true)).toBe('api')
  })

  it('把 API 项目映射成现有页面类型', () => {
    expect(mapApiProject({
      id: 'project-1', title: '项目', description: '说明', category: '科创', goal: '省赛',
      weeklyCommitment: '每周 5h', location: '线上', createdAt: '2026-09-08T00:00:00.000Z',
      neededMembers: 2, memberCount: 3, skills: ['TypeScript'],
    }, '刚刚发布')).toMatchObject({ id: 'project-1', time: '每周 5h', needed: 2, members: 3, created: '刚刚发布', match: 80 })
  })
})
