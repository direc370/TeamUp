import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { TasksService } from './tasks.service'

const member = { projectId: 'p1', userId: 'u1', role: 'member' }

describe('TasksService', () => {
  function deps(task: Record<string, unknown>, memberRow: unknown = member) {
    return {
      tasks: {
        findById: jest.fn().mockResolvedValue(task),
        updateStatus: jest.fn().mockImplementation((_id, status, assigneeId) => ({ ...task, status, assigneeId })),
        appendEvent: jest.fn(),
        listEventsByProject: jest.fn().mockResolvedValue([]),
      },
      memberships: { find: jest.fn().mockResolvedValue(memberRow) },
      projects: { findById: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner-1' }) },
    }
  }

  it('非成员不可接单', async () => {
    const d = deps({ id: 't1', projectId: 'p1', status: 'todo', assigneeId: null }, null)
    const service = new TasksService(d.tasks as never, d.memberships as never, d.projects as never)
    await expect(service.claim('u1', 't1')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('成员接单、提交；非法状态拒绝', async () => {
    const d = deps({ id: 't1', projectId: 'p1', status: 'todo', assigneeId: null })
    const service = new TasksService(d.tasks as never, d.memberships as never, d.projects as never)
    await service.claim('u1', 't1')
    expect(d.tasks.updateStatus).toHaveBeenCalledWith('t1', 'claimed', 'u1')
    expect(d.tasks.appendEvent).toHaveBeenCalled()
    d.tasks.findById.mockResolvedValue({ id: 't1', projectId: 'p1', status: 'todo', assigneeId: null })
    await expect(service.submit('u1', 't1')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('队长验收 submitted；成员不可验收', async () => {
    const d = deps({ id: 't1', projectId: 'p1', status: 'submitted', assigneeId: 'u1' })
    const service = new TasksService(d.tasks as never, d.memberships as never, d.projects as never)
    await expect(service.accept('u1', 't1')).rejects.toBeInstanceOf(ForbiddenException)
    await service.accept('owner-1', 't1')
    expect(d.tasks.updateStatus).toHaveBeenCalledWith('t1', 'accepted', 'u1')
  })

  it('贡献报告去重同一人同一任务同一 type', async () => {
    const d = deps({ id: 't1', projectId: 'p1', status: 'accepted', assigneeId: 'u1' })
    d.tasks.listEventsByProject.mockResolvedValue([
      { actorId: 'u1', taskId: 't1', type: 'claimed' },
      { actorId: 'u1', taskId: 't1', type: 'claimed' },
      { actorId: 'u1', taskId: 't1', type: 'submitted' },
    ])
    const service = new TasksService(d.tasks as never, d.memberships as never, d.projects as never)
    const report = await service.contribution('u1', 'p1')
    expect(report.contributors).toEqual([{ actorId: 'u1', score: 3, events: 2 }])
  })
})
