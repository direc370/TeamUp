import { Injectable } from '@nestjs/common'
import type { ApplicationStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

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

  setStatus(id: string, status: ApplicationStatus) {
    return this.prisma.application.update({ where: { id }, data: { status } })
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

  approveWithMembership(params: {
    applicationId: string
    projectId: string
    applicantId: string
    neededMembers: number
  }) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id: params.applicationId },
        data: { status: 'approved' },
      })
      await tx.membership.create({
        data: { projectId: params.projectId, userId: params.applicantId, role: 'member' },
      })
      const members = await tx.membership.count({ where: { projectId: params.projectId } })
      if (members >= params.neededMembers) {
        await tx.project.update({ where: { id: params.projectId }, data: { status: 'closed' } })
      }
      return { application, members }
    })
  }
}
