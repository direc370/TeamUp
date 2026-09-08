import { Module } from '@nestjs/common'
import { SavedProjectsController } from './saved-projects.controller'
import { SavedProjectsRepository } from './saved-projects.repository'
import { SavedProjectsService } from './saved-projects.service'

@Module({ controllers: [SavedProjectsController], providers: [SavedProjectsService, SavedProjectsRepository] })
export class SavedProjectsModule {}
