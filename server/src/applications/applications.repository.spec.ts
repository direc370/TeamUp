import { Prisma } from '@prisma/client'
import { ApplicationsRepository, ProjectAtCapacityError } from './applications.repository'

describe('ApplicationsRepository approval transaction', () => {
  const params = { applicationId: 'app-1', projectId: 'project-1', applicantId: 'user-1' }
  const pending = { id: 'app-1', status: 'pending', projectId: 'project-1', applicantId: 'user-1' }

  function createRepository(overrides: Record<string, unknown> = {}) {
    const tx = {
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'project-1', status: 'open', neededMembers: 2 }), update: jest.fn() },
      application: { findUnique: jest.fn().mockResolvedValue(pending), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      membership: { findUnique: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(1), create: jest.fn() },
      ...overrides,
    }
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) }
    return { repository: new ApplicationsRepository(prisma as never), prisma, tx }
  }

  it('在可串行化事务中审批、写入成员并在满员时关闭招募', async () => {
    const { repository, prisma, tx } = createRepository()
    await expect(repository.approveWithMembership(params)).resolves.toMatchObject({ id: 'app-1', status: 'approved' })
    expect(tx.membership.create).toHaveBeenCalledWith({ data: { projectId: 'project-1', userId: 'user-1', role: 'member' } })
    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: 'project-1' }, data: { status: 'closed' } })
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  })

  it('名额已满时不改变申请或成员记录', async () => {
    const { repository, tx } = createRepository({
      membership: { findUnique: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(2), create: jest.fn() },
    })
    await expect(repository.approveWithMembership(params)).rejects.toBeInstanceOf(ProjectAtCapacityError)
    expect(tx.application.updateMany).not.toHaveBeenCalled()
    expect(tx.membership.create).not.toHaveBeenCalled()
  })
})
