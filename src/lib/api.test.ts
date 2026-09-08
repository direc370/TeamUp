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
      neededMembers: 2, skills: ['TypeScript'],
    }, '刚刚发布')).toMatchObject({ id: 'project-1', time: '每周 5h', needed: 2, created: '刚刚发布' })
  })
})
