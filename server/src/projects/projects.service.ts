import { Injectable } from '@nestjs/common'
import { CreateProjectDto } from './dto/create-project.dto'
import { ProjectsRepository } from './projects.repository'

@Injectable()
export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}
  list() { return this.repository.list() }
  create(ownerId: string, dto: CreateProjectDto) {
    return this.repository.create({
      ownerId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category.trim(),
      goal: dto.goal.trim(),
      weeklyCommitment: dto.weeklyCommitment.trim(),
      location: dto.location?.trim() || '待完善地点',
      neededMembers: dto.neededMembers ?? 1,
      skills: dto.skills.map((skill) => skill.trim()).filter(Boolean),
      status: this.repository.status(dto.status ?? 'open'),
    })
  }
}
