import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { verify } from 'jsonwebtoken'
import type { AuthenticatedUser, Authenticator } from './authenticator'

@Injectable()
export class JwtAuthenticator implements Authenticator {
  constructor(private readonly config: ConfigService) {}

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const secret = this.config.get<string>('AUTH_JWT_SECRET')
    if (!secret || secret.length < 32) throw new UnauthorizedException('服务端认证未正确配置')
    try {
      const payload = verify(token, secret, { algorithms: ['HS256'] })
      if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('missing subject')
      return { id: payload.sub }
    } catch {
      throw new UnauthorizedException('无效或过期的访问令牌')
    }
  }
}
