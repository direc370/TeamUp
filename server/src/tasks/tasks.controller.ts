import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-request'
import { AuthGuard } from '../auth/auth.guard'
import { TasksService } from './tasks.service'

@Controller()
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('tasks')
  listAll(@Req() req: AuthenticatedRequest) {
    return this.service.list(req.user.id)
  }

  @Get('projects/:projectId/tasks')
  listByProject(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.service.list(req.user.id, projectId)
  }

  @Post('tasks/:id/claim')
  claim(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.claim(req.user.id, id)
  }

  @Post('tasks/:id/submit')
  submit(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.submit(req.user.id, id)
  }

  @Post('tasks/:id/accept')
  accept(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.accept(req.user.id, id)
  }

  @Get('projects/:projectId/contributions')
  contributions(@Req() req: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.service.contribution(req.user.id, projectId)
  }
}
