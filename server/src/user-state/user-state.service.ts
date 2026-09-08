import { Injectable } from '@nestjs/common'
import { UserStateRepository } from './user-state.repository'

@Injectable()
export class UserStateService {
  constructor(private readonly repository: UserStateRepository) {}
  get(userId: string) { return this.repository.get(userId) }
}
