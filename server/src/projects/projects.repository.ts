import { Injectable } from '@nestjs/common'
import type { Prisma, ProjectStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.project.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { memberships: true } } },
    })
  }

  create(data: Prisma.ProjectUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data })
      await tx.membership.create({ data: { projectId: project.id, userId: data.ownerId, role: 'owner' } })
      return project
    })
  }

  findById(id: string) {
    return this.prisma.project.findUnique({ where: { id } })
  }

  setStatus(id: string, status: ProjectStatus) {
    return this.prisma.project.update({ where: { id }, data: { status } })
  }

  status(value: 'draft' | 'open'): ProjectStatus {
    return value
  }
}
