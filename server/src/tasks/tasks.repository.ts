import { Injectable } from '@nestjs/common'
import type { Prisma, TaskStatus } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.task.findUnique({ where: { id } })
  }

  listByProject(projectId: string) {
    return this.prisma.task.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } })
  }

  listForMember(userId: string) {
    return this.prisma.task.findMany({
      where: { project: { memberships: { some: { userId } } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  create(data: Prisma.TaskUncheckedCreateInput) {
    return this.prisma.task.create({ data })
  }

  updateStatus(id: string, status: TaskStatus, assigneeId: string | null) {
    return this.prisma.task.update({ where: { id }, data: { status, assigneeId } })
  }

  appendEvent(taskId: string, actorId: string, type: string, payload: Prisma.InputJsonValue) {
    return this.prisma.taskEvent.create({ data: { taskId, actorId, type, payload } })
  }

  listEventsByProject(projectId: string) {
    return this.prisma.taskEvent.findMany({
      where: { task: { projectId } },
      orderBy: { createdAt: 'asc' },
    })
  }
}
