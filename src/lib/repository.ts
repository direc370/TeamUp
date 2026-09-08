import type { User } from '@supabase/supabase-js'
import type { Post, PostId, PublishForm, UserProjectState } from '../types'
import { parseSkills } from '../logic'
import { createApiClient } from './api'
import { createCloudProject, fetchCloudProjects, fetchCloudUserState, setCloudApplication, setCloudSaved } from './projects'
import { isSupabaseConfigured } from './supabase'

export type DataProvider = 'local' | 'supabase' | 'api'

export interface ProjectRepository {
  readonly provider: DataProvider
  readonly remote: boolean
  listProjects(): Promise<Post[]>
  createProject(user: User, form: PublishForm): Promise<Post>
  setSaved(userId: string, projectId: string, saved: boolean): Promise<void>
  setApplication(userId: string, projectId: string, applied: boolean): Promise<void>
  getUserState(userId: string): Promise<UserProjectState>
}

type ApiProject = {
  id: string
  title: string
  description: string
  category: string
  goal: string
  weeklyCommitment: string
  location: string
  createdAt: string
  neededMembers: number
  skills: string[]
}

export function mapApiProject(project: ApiProject, created = formatCreated(project.createdAt)): Post {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    goal: project.goal,
    time: project.weeklyCommitment,
    location: project.location,
    created,
    members: 1,
    needed: project.neededMembers,
    skills: project.skills,
    match: 80,
    accent: 'lime',
  }
}

function formatCreated(value: string): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return '刚刚发布'
  if (minutes < 60) return `${minutes} 分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`
  return `${Math.floor(minutes / 1440)} 天前`
}

const localRepository: ProjectRepository = {
  provider: 'local',
  remote: false,
  async listProjects() { return [] },
  async createProject(_user, form) {
    return { id: Date.now(), title: form.title.trim(), description: form.description.trim(), category: form.category, goal: form.goal, time: form.time, location: '我发布的项目 · 待完善地点', created: '刚刚发布', members: 1, needed: 2, skills: parseSkills(form.skills), match: 100, accent: 'lime' }
  },
  async setSaved() {},
  async setApplication() {},
  async getUserState() { return { savedIds: [], appliedIds: [] } },
}

const supabaseRepository: ProjectRepository = {
  provider: 'supabase',
  remote: true,
  listProjects: fetchCloudProjects,
  createProject: createCloudProject,
  setSaved: setCloudSaved,
  setApplication: setCloudApplication,
  getUserState: fetchCloudUserState,
}

function apiRepository(baseUrl: string): ProjectRepository {
  const request = createApiClient({ baseUrl })
  return {
    provider: 'api',
    remote: true,
    async listProjects() { return (await request<ApiProject[]>('/projects')).map((project) => mapApiProject(project)) },
    async createProject(_user, form) {
      const project = await request<ApiProject>('/projects', { method: 'POST', body: JSON.stringify({ title: form.title.trim(), description: form.description.trim(), category: form.category, goal: form.goal, weeklyCommitment: form.time, skills: parseSkills(form.skills) }) })
      return { ...mapApiProject(project, '刚刚发布'), match: 100 }
    },
    async setSaved(_userId, projectId, saved) { await request(`/saved-projects/${encodeURIComponent(projectId)}`, { method: saved ? 'PUT' : 'DELETE' }) },
    async setApplication(_userId, projectId, applied) { await request(`/applications/${encodeURIComponent(projectId)}`, { method: applied ? 'PUT' : 'DELETE', body: applied ? JSON.stringify({}) : undefined }) },
    async getUserState() {
      const state = await request<{ savedIds: string[]; appliedIds: string[] }>('/user-state')
      return state
    },
  }
}

export function selectDataProvider(value: string | undefined, supabaseConfigured = isSupabaseConfigured): DataProvider {
  const provider = value?.trim().toLowerCase()
  if (provider === 'local' || provider === 'api' || provider === 'supabase') return provider
  return supabaseConfigured ? 'supabase' : 'local'
}

export function createProjectRepository(provider = selectDataProvider(import.meta.env.VITE_DATA_PROVIDER), apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()): ProjectRepository {
  if (provider === 'local') return localRepository
  if (provider === 'supabase') return supabaseRepository
  if (!apiBaseUrl) throw new Error('API 模式需要配置 VITE_API_BASE_URL')
  return apiRepository(apiBaseUrl)
}

export const projectRepository = createProjectRepository()
export const dataProvider = projectRepository.provider
export const isRemoteProvider = projectRepository.remote

export function isRemoteProjectId(id: PostId): id is string {
  return typeof id === 'string'
}
