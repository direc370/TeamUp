import { BadRequestException, ConflictException, HttpException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { hashRefreshToken } from './auth.repository'
import { TokenService } from './token.service'
import { JwtAuthenticator } from './jwt-authenticator'
import { hashPassword } from './password.hasher'
import { signHs256 } from './hs256'

const SECRET = '8b6d24c9a13e507f92d4b68c1f0a735e'

function config(map: Record<string, string>) {
  return { get: (k: string) => map[k], getOrThrow: (k: string) => map[k] }
}

describe('AuthService', () => {
  const tokens = new TokenService(config({ AUTH_JWT_SECRET: SECRET, JWT_ISSUER: 'saiban', JWT_AUDIENCE: 'saiban-api' }) as never)

  function repo(overrides: Record<string, unknown> = {}) {
    return {
      findCredentialByEmail: jest.fn().mockResolvedValue(null),
      findCredentialByUserId: jest.fn().mockResolvedValue({ email: 'a@b.com', profileId: 'user-1' }),
      createUserWithCredential: jest.fn().mockResolvedValue({ profileId: 'user-1' }),
      createSession: jest.fn().mockResolvedValue({ id: 'sess-1' }),
      findSessionByRefreshHash: jest.fn().mockResolvedValue(null),
      revokeSession: jest.fn().mockResolvedValue({}),
      ...overrides,
    }
  }

  it('注册要求密码至少 8 位并创建 session', async () => {
    const service = new AuthService(repo() as never, tokens)
    await expect(service.register('a@b.com', 'short')).rejects.toBeInstanceOf(BadRequestException)
    const result = await service.register('a@b.com', 'password1')
    expect(result.refreshToken.length).toBeGreaterThanOrEqual(32)
    expect(result.userId).toBe('user-1')
    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com' })
  })

  it('重复邮箱冲突', async () => {
    const service = new AuthService(repo({ findCredentialByEmail: jest.fn().mockResolvedValue({ id: 'c1' }) }) as never, tokens)
    await expect(service.register('a@b.com', 'password1')).rejects.toBeInstanceOf(ConflictException)
  })

  it('登录错误密码拒绝，正确密码发 token', async () => {
    const passwordHash = await hashPassword('password1')
    const r = repo({
      findCredentialByEmail: jest.fn().mockResolvedValue({ profileId: 'user-1', passwordHash, email: 'a@b.com' }),
    })
    const service = new AuthService(r as never, tokens)
    await expect(service.login('a@b.com', 'wrongpass')).rejects.toBeInstanceOf(UnauthorizedException)
    const ok = await service.login('a@b.com', 'password1')
    expect(ok.accessToken).toBeTruthy()
  })

  it('同 IP+email 每分钟超过 5 次限流', async () => {
    const service = new AuthService(repo() as never, tokens)
    for (let i = 0; i < 5; i++) await service.register('same@b.com', 'password1', '1.1.1.1')
    await expect(service.register('same@b.com', 'password1', '1.1.1.1')).rejects.toBeInstanceOf(HttpException)
  })

  it('refresh 拒绝伪造、过期、撤销；成功则轮换', async () => {
    const refresh = 'x'.repeat(32)
    const service = new AuthService(
      repo({
        findSessionByRefreshHash: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 's1', userId: 'user-1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) })
          .mockResolvedValueOnce({ id: 's2', userId: 'user-1', revokedAt: null, expiresAt: new Date(Date.now() - 1000) })
          .mockResolvedValueOnce({ id: 's3', userId: 'user-1', revokedAt: null, expiresAt: new Date(Date.now() + 60_000) }),
      }) as never,
      tokens,
    )
    await expect(service.refresh(refresh)).rejects.toThrow('无效')
    await expect(service.refresh(refresh)).rejects.toThrow('撤销')
    await expect(service.refresh(refresh)).rejects.toThrow('过期')
    const ok = await service.refresh(refresh)
    expect(ok.userId).toBe('user-1')
    expect(hashRefreshToken(refresh)).toHaveLength(64)
  })

  it('logout 撤销 session', async () => {
    const r = repo({
      findSessionByRefreshHash: jest.fn().mockResolvedValue({ id: 's1', revokedAt: null, expiresAt: new Date(Date.now() + 1000) }),
    })
    const service = new AuthService(r as never, tokens)
    await expect(service.logout('r'.repeat(32))).resolves.toEqual({ revoked: true })
    expect(r.revokeSession).toHaveBeenCalledWith('s1')
  })
})

describe('JwtAuthenticator', () => {
  const authenticator = new JwtAuthenticator(config({ AUTH_JWT_SECRET: SECRET, JWT_ISSUER: 'saiban', JWT_AUDIENCE: 'saiban-api' }) as never)

  it('拒绝伪造和过期 token，接受带 iss/aud 的合法 token', async () => {
    await expect(authenticator.authenticate('not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedException)
    const expired = signHs256({ sub: 'u1' }, SECRET, {
      expiresInSec: 60,
      issuer: 'saiban',
      audience: 'saiban-api',
      issuedAtSec: Math.floor(Date.now() / 1000) - 120,
    })
    await expect(authenticator.authenticate(expired)).rejects.toBeInstanceOf(UnauthorizedException)
    const wrongIss = signHs256({ sub: 'u1' }, SECRET, { expiresInSec: 900, issuer: 'other', audience: 'saiban-api' })
    await expect(authenticator.authenticate(wrongIss)).rejects.toBeInstanceOf(UnauthorizedException)
    const ok = signHs256({ sub: 'u1' }, SECRET, { expiresInSec: 900, issuer: 'saiban', audience: 'saiban-api' })
    await expect(authenticator.authenticate(ok)).resolves.toEqual({ id: 'u1' })
  })
})
