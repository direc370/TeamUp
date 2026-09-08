import { BadRequestException, ConflictException } from '@nestjs/common'
import { ApplicationsService } from './applications.service'

const project = { id: 'project-1', ownerId: 'owner-1', status: 'open' }

describe('ApplicationsService', () => {
  it('禁止申请自己的项目', async () => {
    const applications = { find: jest.fn(), create: jest.fn(), setStatus: jest.fn() }
    const projects = { findById: jest.fn().mockResolvedValue(project) }
    const service = new ApplicationsService(applications as never, projects as never)
    await expect(service.apply('owner-1', 'project-1')).rejects.toBeInstanceOf(BadRequestException)
    expect(applications.create).not.toHaveBeenCalled()
  })

  it('首次申请创建 pending，重复申请返回原记录', async () => {
    const pending = { id: 'app-1', projectId: 'project-1', applicantId: 'user-1', status: 'pending' }
    const applications = { find: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(pending), create: jest.fn().mockResolvedValue(pending), setStatus: jest.fn() }
    const projects = { findById: jest.fn().mockResolvedValue(project) }
    const service = new ApplicationsService(applications as never, projects as never)
    await expect(service.apply('user-1', 'project-1', '加入')).resolves.toEqual(pending)
    await expect(service.apply('user-1', 'project-1', '重复')).resolves.toEqual(pending)
    expect(applications.create).toHaveBeenCalledTimes(1)
  })

  it('withdrawn 可以转回 pending，approved 不可重开', async () => {
    const applications = {
      find: jest.fn().mockResolvedValueOnce({ id: 'app-1', status: 'withdrawn' }).mockResolvedValueOnce({ id: 'app-1', status: 'approved' }),
      create: jest.fn(), setStatus: jest.fn().mockResolvedValue({ id: 'app-1', status: 'pending' }),
    }
    const projects = { findById: jest.fn().mockResolvedValue(project) }
    const service = new ApplicationsService(applications as never, projects as never)
    await service.apply('user-1', 'project-1', '再次申请')
    expect(applications.setStatus).toHaveBeenCalledWith('app-1', 'pending')
    await expect(service.apply('user-1', 'project-1')).rejects.toBeInstanceOf(ConflictException)
  })

  it('仅 pending 可撤回，重复撤回幂等', async () => {
    const applications = { find: jest.fn().mockResolvedValueOnce({ id: 'app-1', status: 'pending' }).mockResolvedValueOnce({ id: 'app-1', status: 'withdrawn' }), setStatus: jest.fn().mockResolvedValue({ id: 'app-1', status: 'withdrawn' }) }
    const service = new ApplicationsService(applications as never, {} as never)
    await service.withdraw('user-1', 'project-1')
    expect(applications.setStatus).toHaveBeenCalledWith('app-1', 'withdrawn')
    await expect(service.withdraw('user-1', 'project-1')).resolves.toEqual({ projectId: 'project-1', status: 'withdrawn' })
  })
})
