import { SavedProjectsService } from './saved-projects.service'

describe('SavedProjectsService', () => {
  it('重复收藏保持幂等并固定使用同一复合键', async () => {
    const repository = { save: jest.fn().mockResolvedValue({}), unsave: jest.fn() }
    const service = new SavedProjectsService(repository as never)
    await expect(service.save('user-1', 'project-1')).resolves.toEqual({ projectId: 'project-1', saved: true })
    await expect(service.save('user-1', 'project-1')).resolves.toEqual({ projectId: 'project-1', saved: true })
    expect(repository.save).toHaveBeenNthCalledWith(1, 'user-1', 'project-1')
    expect(repository.save).toHaveBeenNthCalledWith(2, 'user-1', 'project-1')
  })

  it('重复取消收藏保持幂等', async () => {
    const repository = { save: jest.fn(), unsave: jest.fn().mockResolvedValue(undefined) }
    const service = new SavedProjectsService(repository as never)
    await service.unsave('user-1', 'project-1')
    await expect(service.unsave('user-1', 'project-1')).resolves.toEqual({ projectId: 'project-1', saved: false })
  })
})
