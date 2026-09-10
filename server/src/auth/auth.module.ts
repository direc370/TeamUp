import { Global, Module } from '@nestjs/common'
import { AUTHENTICATOR } from './authenticator'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthRepository } from './auth.repository'
import { AuthService } from './auth.service'
import { JwtAuthenticator } from './jwt-authenticator'
import { TokenService } from './token.service'

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    JwtAuthenticator,
    { provide: AUTHENTICATOR, useExisting: JwtAuthenticator },
    AuthGuard,
    AuthRepository,
    AuthService,
    TokenService,
  ],
  exports: [AUTHENTICATOR, AuthGuard],
})
export class AuthModule {}
