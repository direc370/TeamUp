import { Injectable } from '@nestjs/common'
import type { ApplicationStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(projectId: string, applicantId: string) { return this.prisma.application.findUnique({ where: { projectId_applicantId: { projectId, applicantId } } }) }
  create(projectId: string, applicantId: string, message: string) { return this.prisma.application.create({ data: { projectId, applicantId, message, status: 'pending' } }) }
  setStatus(id: string, status: ApplicationStatus) { return this.prisma.application.update({ where: { id }, data: { status } }) }
}
