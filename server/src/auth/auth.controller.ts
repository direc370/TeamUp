import { Body, Controller, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.service.register(dto.email, dto.password, clientIp(req))
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.service.login(dto.email, dto.password, clientIp(req))
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.service.refresh(dto.refreshToken)
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.service.logout(dto.refreshToken)
  }
}

function clientIp(req: Request) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}
