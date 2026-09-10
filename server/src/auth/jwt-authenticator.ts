import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AuthenticatedUser, Authenticator } from './authenticator'
import { verifyHs256 } from './hs256'

@Injectable()
export class JwtAuthenticator implements Authenticator {
  constructor(private readonly config: ConfigService) {}

  async authenticate(token: string): Promise<AuthenticatedUser> {
    const secret = this.config.get<string>('AUTH_JWT_SECRET')
    if (!secret || secret.length < 32) throw new UnauthorizedException('服务端认证未正确配置')
    const issuer = this.config.get<string>('JWT_ISSUER') || 'saiban'
    const audience = this.config.get<string>('JWT_AUDIENCE') || 'saiban-api'
    try {
      return { id: verifyHs256(token, secret, issuer, audience).sub }
    } catch {
      throw new UnauthorizedException('无效或过期的访问令牌')
    }
  }
}
