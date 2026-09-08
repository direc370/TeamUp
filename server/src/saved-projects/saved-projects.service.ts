import { Injectable } from '@nestjs/common'
import { SavedProjectsRepository } from './saved-projects.repository'

@Injectable()
export class SavedProjectsService {
  constructor(private readonly repository: SavedProjectsRepository) {}
  async save(userId: string, projectId: string) { await this.repository.save(userId, projectId); return { projectId, saved: true } }
  async unsave(userId: string, projectId: string) { await this.repository.unsave(userId, projectId); return { projectId, saved: false } }
}
