import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import type { AuthenticatedRequest } from './authenticated-request'
import { AUTHENTICATOR, type Authenticator } from './authenticator'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTHENTICATOR) private readonly authenticator: Authenticator) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('缺少 Bearer 访问令牌')
    request.user = await this.authenticator.authenticate(authorization.slice(7))
    return true
  }
}
