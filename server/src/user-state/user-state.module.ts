import { Module } from '@nestjs/common'
import { UserStateController } from './user-state.controller'
import { UserStateRepository } from './user-state.repository'
import { UserStateService } from './user-state.service'

@Module({ controllers: [UserStateController], providers: [UserStateService, UserStateRepository] })
export class UserStateModule {}
