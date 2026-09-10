import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { TaskStatus } from '@prisma/client'
import { MembershipsRepository } from '../memberships/memberships.repository'
import { ProjectsRepository } from '../projects/projects.repository'
import { TasksRepository } from './tasks.repository'

const SCORE: Record<string, number> = { claimed: 1, submitted: 2, accepted: 3 }

@Injectable()
export class TasksService {
  constructor(
    private readonly tasks: TasksRepository,
    private readonly memberships: MembershipsRepository,
    private readonly projects: ProjectsRepository,
  ) {}

  async list(userId: string, projectId?: string) {
    if (projectId) {
      await this.requireMember(projectId, userId)
      return this.tasks.listByProject(projectId)
    }
    return this.tasks.listForMember(userId)
  }

  async claim(userId: string, taskId: string) {
    const task = await this.requireTask(taskId)
    await this.requireMember(task.projectId, userId)
    this.assertStatus(task.status, ['todo'], '仅待领取任务可以接单')
    const updated = await this.tasks.updateStatus(taskId, 'claimed', userId)
    await this.tasks.appendEvent(taskId, userId, 'claimed', { from: task.status, to: 'claimed' })
    return updated
  }

  async submit(userId: string, taskId: string) {
    const task = await this.requireTask(taskId)
    await this.requireMember(task.projectId, userId)
    this.assertStatus(task.status, ['claimed'], '仅已接单任务可以提交')
    if (task.assigneeId !== userId) throw new ForbiddenException('只能提交自己领取的任务')
    const updated = await this.tasks.updateStatus(taskId, 'submitted', userId)
    await this.tasks.appendEvent(taskId, userId, 'submitted', { from: task.status, to: 'submitted' })
    return updated
  }

  async accept(userId: string, taskId: string) {
    const task = await this.requireTask(taskId)
    const project = await this.projects.findById(task.projectId)
    if (!project) throw new NotFoundException('项目不存在')
    if (project.ownerId !== userId) throw new ForbiddenException('仅队长可以验收')
    this.assertStatus(task.status, ['submitted'], '仅已提交任务可以验收')
    const updated = await this.tasks.updateStatus(taskId, 'accepted', task.assigneeId)
    await this.tasks.appendEvent(taskId, userId, 'accepted', { from: task.status, to: 'accepted' })
    return updated
  }

  async contribution(userId: string, projectId: string) {
    await this.requireMember(projectId, userId)
    const events = await this.tasks.listEventsByProject(projectId)
    const seen = new Set<string>()
    const byActor = new Map<string, { actorId: string; score: number; events: number }>()
    for (const event of events) {
      const key = `${event.actorId}:${event.taskId}:${event.type}`
      if (seen.has(key)) continue
      seen.add(key)
      const row = byActor.get(event.actorId) ?? { actorId: event.actorId, score: 0, events: 0 }
      row.events += 1
      row.score += SCORE[event.type] ?? 0
      byActor.set(event.actorId, row)
    }
    return { projectId, contributors: [...byActor.values()] }
  }

  private async requireTask(taskId: string) {
    const task = await this.tasks.findById(taskId)
    if (!task) throw new NotFoundException('任务不存在')
    return task
  }

  private async requireMember(projectId: string, userId: string) {
    const member = await this.memberships.find(projectId, userId)
    if (!member) throw new ForbiddenException('非项目成员不可操作任务')
    return member
  }

  private assertStatus(current: TaskStatus, allowed: TaskStatus[], message: string) {
    if (!allowed.includes(current)) throw new BadRequestException(message)
  }
}
