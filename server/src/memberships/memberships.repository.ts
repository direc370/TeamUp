import { Injectable } from '@nestjs/common'
import type { MembershipRole } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(projectId: string, userId: string) {
    return this.prisma.membership.findUnique({ where: { projectId_userId: { projectId, userId } } })
  }

  count(projectId: string) {
    return this.prisma.membership.count({ where: { projectId } })
  }

  create(projectId: string, userId: string, role: MembershipRole) {
    return this.prisma.membership.create({ data: { projectId, userId, role } })
  }

  listByOwner(ownerId: string) {
    return this.prisma.membership.findMany({ where: { userId: ownerId, role: 'owner' }, select: { projectId: true } })
  }
}
