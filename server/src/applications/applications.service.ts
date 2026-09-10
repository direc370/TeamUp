import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { MembershipsRepository } from '../memberships/memberships.repository'
import { ProjectsRepository } from '../projects/projects.repository'
import { ApplicationsRepository } from './applications.repository'

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applications: ApplicationsRepository,
    private readonly projects: ProjectsRepository,
    private readonly memberships: MembershipsRepository,
  ) {}

  async apply(applicantId: string, projectId: string, message = '') {
    const project = await this.projects.findById(projectId)
    if (!project) throw new NotFoundException('项目不存在')
    if (project.ownerId === applicantId) throw new BadRequestException('不能申请自己创建的项目')
    if (project.status !== 'open') throw new ConflictException('项目当前不接受申请')
    const existingMember = await this.memberships.find(projectId, applicantId)
    if (existingMember) throw new ConflictException('已是项目成员，不能再次申请')
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

  async listMineAsOwner(ownerId: string) {
    const owned = await this.memberships.listByOwner(ownerId)
    const projectIds = owned.map((row) => row.projectId)
    if (projectIds.length === 0) return []
    const rows = await this.applications.listPendingForProjects(projectIds)
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      projectTitle: row.project.title,
      applicantId: row.applicantId,
      message: row.message,
      status: row.status,
      createdAt: row.createdAt,
    }))
  }

  async decide(ownerId: string, applicationId: string, decision: 'approved' | 'rejected') {
    const application = await this.applications.findById(applicationId)
    if (!application) throw new NotFoundException('申请不存在')
    const project = await this.projects.findById(application.projectId)
    if (!project) throw new NotFoundException('项目不存在')
    if (project.ownerId !== ownerId) throw new ForbiddenException('仅队长可以审批申请')
    if (application.status === decision) return application
    if (application.status !== 'pending') throw new ConflictException('申请已处理')
    if (decision === 'rejected') return this.applications.setStatus(application.id, 'rejected')
    const existing = await this.memberships.find(application.projectId, application.applicantId)
    if (existing) {
      return this.applications.setStatus(application.id, 'approved')
    }
    await this.applications.approveWithMembership({
      applicationId: application.id,
      projectId: application.projectId,
      applicantId: application.applicantId,
      neededMembers: project.neededMembers,
    })
    return this.applications.findById(application.id)
  }
}
