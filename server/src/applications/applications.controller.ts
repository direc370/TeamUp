import { Body, Controller, Delete, Param, Put, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-request'
import { AuthGuard } from '../auth/auth.guard'
import { ApplicationsService } from './applications.service'
import { CreateApplicationDto } from './create-application.dto'

@Controller('applications')
@UseGuards(AuthGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}
  @Put(':projectId') apply(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string, @Body() dto: CreateApplicationDto) {
    return this.service.apply(req.user.id, projectId, dto.message)
  }
  @Delete(':projectId') withdraw(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.service.withdraw(req.user.id, projectId)
  }
}
