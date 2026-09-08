import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class UserStateRepository {
  constructor(private readonly prisma: PrismaService) {}
  async get(userId: string) {
    const [saved, applications] = await Promise.all([
      this.prisma.savedProject.findMany({ where: { userId }, select: { projectId: true } }),
      this.prisma.application.findMany({ where: { applicantId: userId, status: 'pending' }, select: { projectId: true } }),
    ])
    return { savedIds: saved.map((item) => item.projectId), appliedIds: applications.map((item) => item.projectId) }
  }
}
