import { Injectable } from '@nestjs/common'
import type { Prisma, ProjectStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.project.findMany({ where: { status: 'open' }, orderBy: { createdAt: 'desc' } }) }
  create(data: Prisma.ProjectUncheckedCreateInput) { return this.prisma.project.create({ data }) }
  findById(id: string) { return this.prisma.project.findUnique({ where: { id } }) }
  status(value: 'draft' | 'open'): ProjectStatus { return value }
}
