import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-request'
import { AuthGuard } from '../auth/auth.guard'
import { UserStateService } from './user-state.service'

@Controller('user-state')
@UseGuards(AuthGuard)
export class UserStateController {
  constructor(private readonly service: UserStateService) {}
  @Get() get(@Req() req: AuthenticatedRequest) { return this.service.get(req.user.id) }
}
