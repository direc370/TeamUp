import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ProjectsRepository } from '../projects/projects.repository'
import { ApplicationsRepository } from './applications.repository'

@Injectable()
export class ApplicationsService {
  constructor(private readonly applications: ApplicationsRepository, private readonly projects: ProjectsRepository) {}

  async apply(applicantId: string, projectId: string, message = '') {
    const project = await this.projects.findById(projectId)
    if (!project) throw new NotFoundException('项目不存在')
    if (project.ownerId === applicantId) throw new BadRequestException('不能申请自己创建的项目')
    if (project.status !== 'open') throw new ConflictException('项目当前不接受申请')
    const current = await this.applications.find(projectId, applicantId)
    if (!current) return this.applications.create(projectId, applicantId, message.trim())
    if (current.status === 'pending') return current
    if (current.status === 'withdrawn') return this.applications.setStatus(current.id, 'pending')
    throw new ConflictException(`申请已${current.status === 'approved' ? '通过' : '拒绝'}，不能重新申请`)
  }

  async withdraw(applicantId: string, projectId: string) {
    const current = await this.applications.find(projectId, applicantId)
    if (!current || current.status === 'withdrawn') return { projectId, status: 'withdrawn' as const }
    if (current.status !== 'pending') throw new ConflictException('仅待处理申请可以撤回')
    return this.applications.setStatus(current.id, 'withdrawn')
  }
}
