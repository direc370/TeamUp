import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-request'
import { AuthGuard } from '../auth/auth.guard'
import { ApplicationsService } from './applications.service'
import { CreateApplicationDto } from './create-application.dto'

@Controller('applications')
@UseGuards(AuthGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Get('inbox')
  inbox(@Req() req: AuthenticatedRequest) {
    return this.service.listMineAsOwner(req.user.id)
  }

  @Put(':projectId')
  apply(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string, @Body() dto: CreateApplicationDto) {
    return this.service.apply(req.user.id, projectId, dto.message)
  }

  @Delete(':projectId')
  withdraw(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.service.withdraw(req.user.id, projectId)
  }

  @Post(':id/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.decide(req.user.id, id, 'approved')
  }

  @Post(':id/reject')
  reject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.decide(req.user.id, id, 'rejected')
  }
}
