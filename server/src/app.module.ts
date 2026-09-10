import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ApplicationsModule } from './applications/applications.module'
import { AuthModule } from './auth/auth.module'
import { validateConfig } from './config/validator'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { MembershipsModule } from './memberships/memberships.module'
import { ProjectsModule } from './projects/projects.module'
import { SavedProjectsModule } from './saved-projects/saved-projects.module'
import { TasksModule } from './tasks/tasks.module'
import { UserStateModule } from './user-state/user-state.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }), DatabaseModule, AuthModule, MembershipsModule, ProjectsModule, SavedProjectsModule, ApplicationsModule, TasksModule, UserStateModule],
  controllers: [HealthController],
})
export class AppModule {}
