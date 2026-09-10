import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthRepository, hashRefreshToken } from './auth.repository'
import { MemoryRateLimiter } from './memory-rate-limiter'
import { hashPassword, verifyPassword } from './password.hasher'
import { TokenService } from './token.service'

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000

@Injectable()
export class AuthService {
  private readonly limiter = new MemoryRateLimiter(5, 60_000)

  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
  ) {}

  async register(email: string, password: string, ip = 'unknown') {
    this.assertRateLimit(ip, email)
    if (password.length < 8) throw new BadRequestException('密码至少 8 位')
    const existing = await this.repository.findCredentialByEmail(email)
    if (existing) throw new ConflictException('邮箱已注册')
    const passwordHash = await hashPassword(password)
    const created = await this.repository.createUserWithCredential(email, passwordHash)
    return this.issuePair(created.profileId, email.toLowerCase())
  }

  async login(email: string, password: string, ip = 'unknown') {
    this.assertRateLimit(ip, email)
    const credential = await this.repository.findCredentialByEmail(email)
    if (!credential || !(await verifyPassword(password, credential.passwordHash))) {
      throw new UnauthorizedException('邮箱或密码错误')
    }
    return this.issuePair(credential.profileId, credential.email)
  }

  async refresh(refreshToken: string) {
    if (!refreshToken || refreshToken.length < 32) throw new UnauthorizedException('刷新令牌无效')
    const session = await this.repository.findSessionByRefreshHash(hashRefreshToken(refreshToken))
    if (!session) throw new UnauthorizedException('刷新令牌无效')
    if (session.revokedAt) throw new UnauthorizedException('刷新令牌已撤销')
    if (session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('刷新令牌已过期')
    await this.repository.revokeSession(session.id)
    const credential = await this.repository.findCredentialByUserId(session.userId)
    return this.issuePair(session.userId, credential?.email ?? '')
  }

  async logout(refreshToken: string) {
    if (!refreshToken || refreshToken.length < 32) return { revoked: true }
    const session = await this.repository.findSessionByRefreshHash(hashRefreshToken(refreshToken))
    if (session && !session.revokedAt) await this.repository.revokeSession(session.id)
    return { revoked: true }
  }

  private assertRateLimit(ip: string, email: string) {
    if (!this.limiter.consume(`${ip}:${email.toLowerCase()}`)) {
      throw new HttpException('尝试过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS)
    }
  }

  private async issuePair(userId: string, email: string) {
    const accessToken = this.tokens.issueAccessToken(userId)
    const refreshToken = this.tokens.issueRefreshToken()
    await this.repository.createSession(userId, hashRefreshToken(refreshToken), new Date(Date.now() + REFRESH_TTL_MS))
    return {
      userId,
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user: { id: userId, email },
    }
  }
}
