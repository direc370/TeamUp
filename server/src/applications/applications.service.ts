import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { MembershipsRepository } from '../memberships/memberships.repository'
import { ProjectsRepository } from '../projects/projects.repository'
import { ApplicationsRepository, ProjectAtCapacityError } from './applications.repository'
import { CreateApplicationDto } from './create-application.dto'

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applications: ApplicationsRepository,
    private readonly projects: ProjectsRepository,
    private readonly memberships: MembershipsRepository,
  ) {}

  async apply(applicantId: string, projectId: string, dto: CreateApplicationDto) {
    const project = await this.projects.findById(projectId)
    if (!project) throw new NotFoundException('项目不存在')
    if (project.ownerId === applicantId) throw new BadRequestException('不能申请自己创建的项目')
    if (project.status !== 'open') throw new ConflictException('项目当前不接受申请')
    const existingMember = await this.memberships.find(projectId, applicantId)
    if (existingMember) throw new ConflictException('已是项目成员，不能再次申请')
    const form = {
      roleTags: dto.roleTags.map((tag) => tag.trim()).filter(Boolean),
      experience: dto.experience.trim(),
      availability: dto.availability,
      fitReason: dto.fitReason.trim(),
      links: (dto.links ?? []).map((link) => link.trim()).filter(Boolean),
      note: dto.note?.trim() ?? '',
    }
    const current = await this.applications.find(projectId, applicantId)
    if (!current) return this.applications.create(projectId, applicantId, form)
    if (current.status === 'pending') return current
    if (current.status === 'withdrawn') return this.applications.reopen(current.id, form)
    throw new ConflictException(`申请已${current.status === 'approved' ? '通过' : '拒绝'}，不能重新申请`)
  }

  async withdraw(applicantId: string, projectId: string) {
    const current = await this.applications.find(projectId, applicantId)
    if (!current || current.status === 'withdrawn') return { projectId, status: 'withdrawn' as const }
    if (current.status !== 'pending') throw new ConflictException('仅待处理申请可以撤回')
    return this.applications.setPendingStatus(current.id, 'withdrawn')
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
      applicant: row.applicant,
      roleTags: row.roleTags,
      experience: row.experience,
      availability: row.availability,
      fitReason: row.fitReason,
      links: row.links,
      note: row.note,
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
    if (decision === 'rejected') return this.applications.setPendingStatus(application.id, 'rejected')
    const existing = await this.memberships.find(application.projectId, application.applicantId)
    if (existing) {
      return this.applications.setPendingStatus(application.id, 'approved')
    }
    try {
      await this.applications.approveWithMembership({
        applicationId: application.id,
        projectId: application.projectId,
        applicantId: application.applicantId,
      })
    } catch (error) {
      if (error instanceof ProjectAtCapacityError) throw new ConflictException('项目已满员或关闭招募')
      throw error
    }
    return this.applications.findById(application.id)
  }
}
