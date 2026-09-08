import { Module } from '@nestjs/common'
import { ProjectsModule } from '../projects/projects.module'
import { ApplicationsController } from './applications.controller'
import { ApplicationsRepository } from './applications.repository'
import { ApplicationsService } from './applications.service'

@Module({ imports: [ProjectsModule], controllers: [ApplicationsController], providers: [ApplicationsService, ApplicationsRepository] })
export class ApplicationsModule {}
