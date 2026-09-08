import { Global, Module } from '@nestjs/common'
import { AUTHENTICATOR } from './authenticator'
import { AuthGuard } from './auth.guard'
import { JwtAuthenticator } from './jwt-authenticator'

@Global()
@Module({
  providers: [JwtAuthenticator, { provide: AUTHENTICATOR, useExisting: JwtAuthenticator }, AuthGuard],
  exports: [AUTHENTICATOR, AuthGuard],
})
export class AuthModule {}
