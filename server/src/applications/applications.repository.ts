import { Injectable } from '@nestjs/common'
import { Prisma, type ApplicationStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

export class ProjectAtCapacityError extends Error {}

function isSerializationFailure(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code?: unknown }).code === 'P2034'
}

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(projectId: string, applicantId: string) {
    return this.prisma.application.findUnique({ where: { projectId_applicantId: { projectId, applicantId } } })
  }

  findById(id: string) {
    return this.prisma.application.findUnique({ where: { id } })
  }

  listPendingForProjects(projectIds: string[]) {
    return this.prisma.application.findMany({
      where: { projectId: { in: projectIds }, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        project: { select: { title: true } },
        applicant: { select: { displayName: true, school: true, major: true } },
      },
    })
  }

  create(projectId: string, applicantId: string, form: {
    roleTags: string[]
    experience: string
    availability: string
    fitReason: string
    links: string[]
    note: string
  }) {
    return this.prisma.application.create({ data: { projectId, applicantId, ...form, status: 'pending' } })
  }

  async setPendingStatus(id: string, status: ApplicationStatus) {
    await this.prisma.application.updateMany({ where: { id, status: 'pending' }, data: { status } })
    return this.findById(id)
  }

  reopen(id: string, form: {
    roleTags: string[]
    experience: string
    availability: string
    fitReason: string
    links: string[]
    note: string
  }) {
    return this.prisma.application.update({ where: { id }, data: { ...form, status: 'pending' } })
  }

  async approveWithMembership(params: {
    applicationId: string
    projectId: string
    applicantId: string
  }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const project = await tx.project.findUnique({ where: { id: params.projectId } })
          if (!project || project.status !== 'open') throw new ProjectAtCapacityError('项目当前已满员或关闭招募')

          const application = await tx.application.findUnique({ where: { id: params.applicationId } })
          if (!application || application.status !== 'pending') return application

          const existing = await tx.membership.findUnique({
            where: { projectId_userId: { projectId: params.projectId, userId: params.applicantId } },
          })
          if (existing) {
            await tx.application.updateMany({ where: { id: application.id, status: 'pending' }, data: { status: 'approved' } })
            return tx.application.findUnique({ where: { id: application.id } })
          }

          const members = await tx.membership.count({ where: { projectId: params.projectId } })
          if (members >= project.neededMembers) throw new ProjectAtCapacityError('项目当前已满员或关闭招募')

          const changed = await tx.application.updateMany({
            where: { id: application.id, status: 'pending' },
            data: { status: 'approved' },
          })
          if (changed.count === 0) return tx.application.findUnique({ where: { id: application.id } })

          await tx.membership.create({
            data: { projectId: params.projectId, userId: params.applicantId, role: 'member' },
          })
          if (members + 1 >= project.neededMembers) {
            await tx.project.update({ where: { id: params.projectId }, data: { status: 'closed' } })
          }
          return { ...application, status: 'approved' as const }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        if (!isSerializationFailure(error) || attempt === 2) throw error
      }
    }
    throw new Error('审批事务重试意外结束')
  }
}
