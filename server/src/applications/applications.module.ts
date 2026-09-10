import { Module } from '@nestjs/common'
import { MembershipsModule } from '../memberships/memberships.module'
import { ProjectsModule } from '../projects/projects.module'
import { ApplicationsController } from './applications.controller'
import { ApplicationsRepository } from './applications.repository'
import { ApplicationsService } from './applications.service'

@Module({
  imports: [ProjectsModule, MembershipsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsRepository],
})
export class ApplicationsModule {}
