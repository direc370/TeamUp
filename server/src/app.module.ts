import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ApplicationsModule } from './applications/applications.module'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health.controller'
import { ProjectsModule } from './projects/projects.module'
import { SavedProjectsModule } from './saved-projects/saved-projects.module'
import { UserStateModule } from './user-state/user-state.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule, ProjectsModule, SavedProjectsModule, ApplicationsModule, UserStateModule],
  controllers: [HealthController],
})
export class AppModule {}
