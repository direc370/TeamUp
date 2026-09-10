import { Module } from '@nestjs/common'
import { MembershipsModule } from '../memberships/memberships.module'
import { ProjectsModule } from '../projects/projects.module'
import { TasksController } from './tasks.controller'
import { TasksRepository } from './tasks.repository'
import { TasksService } from './tasks.service'

@Module({
  imports: [MembershipsModule, ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
})
export class TasksModule {}
