import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class SavedProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async save(userId: string, projectId: string) {
    return this.prisma.savedProject.upsert({ where: { userId_projectId: { userId, projectId } }, create: { userId, projectId }, update: {} })
  }
  async unsave(userId: string, projectId: string) {
    await this.prisma.savedProject.deleteMany({ where: { userId, projectId } })
  }
}
