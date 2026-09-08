import { ProjectsService } from './projects.service'

describe('ProjectsService', () => {
  it('创建项目时只使用认证上下文中的 ownerId', async () => {
    const repository = { create: jest.fn(async (data) => data), status: (value: string) => value, list: jest.fn() }
    const service = new ProjectsService(repository as never)
    const dto = { title: ' 合法项目 ', description: ' 足够长的项目协作需求描述 ', category: '科创', goal: '省赛', weeklyCommitment: '5h', skills: [' TypeScript '] }
    await service.create('authenticated-user', dto)
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'authenticated-user' }))
    expect(repository.create.mock.calls[0][0]).not.toHaveProperty('userId')
  })
})
