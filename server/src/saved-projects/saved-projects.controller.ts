import { Controller, Delete, Param, Put, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-request'
import { AuthGuard } from '../auth/auth.guard'
import { SavedProjectsService } from './saved-projects.service'

@Controller('saved-projects')
@UseGuards(AuthGuard)
export class SavedProjectsController {
  constructor(private readonly service: SavedProjectsService) {}
  @Put(':projectId') save(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) { return this.service.save(req.user.id, projectId) }
  @Delete(':projectId') unsave(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) { return this.service.unsave(req.user.id, projectId) }
}
