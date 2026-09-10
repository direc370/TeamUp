import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'crypto'
import { signHs256 } from './hs256'

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  issueAccessToken(userId: string) {
    const secret = this.config.getOrThrow<string>('AUTH_JWT_SECRET')
    const issuer = this.config.get<string>('JWT_ISSUER') || 'saiban'
    const audience = this.config.get<string>('JWT_AUDIENCE') || 'saiban-api'
    return signHs256({ sub: userId }, secret, { expiresInSec: 15 * 60, issuer, audience })
  }

  issueRefreshToken() {
    return randomBytes(32).toString('hex')
  }
}
