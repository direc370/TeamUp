import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-request'
import { AuthGuard } from '../auth/auth.guard'
import { CreateProjectDto } from './dto/create-project.dto'
import { ProjectsService } from './projects.service'

@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Get() list() { return this.service.list() }
  @Post() @UseGuards(AuthGuard) create(@Req() request: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.service.create(request.user.id, dto)
  }
}
