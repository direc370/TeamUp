import type { Post, PostId, PublishForm, UserProjectState } from '../types'
import { parseSkills } from '../logic'
import { createApiClient } from './api'
import { getApiAccessToken } from './auth-session'
import { createCloudProject, fetchCloudProjects, fetchCloudUserState, setCloudApplication, setCloudSaved } from './projects'
import { isSupabaseConfigured, supabase } from './supabase'

export type DataProvider = 'local' | 'supabase' | 'api'

export type ProjectApplication = {
  id: string
  projectId: string
  projectTitle?: string
  applicantId?: string
  applicantEmail?: string
  message?: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | string
  createdAt?: string
}

export type ProjectTask = {
  id: string
  projectId?: string
  title: string
  status?: string
  description?: string
}

export interface ProjectRepository {
  readonly provider: DataProvider
  readonly remote: boolean
  listProjects(): Promise<Post[]>
  createProject(user: { id: string }, form: PublishForm): Promise<Post>
  setSaved(userId: string, projectId: string, saved: boolean): Promise<void>
  setApplication(userId: string, projectId: string, applied: boolean): Promise<void>
  getUserState(userId: string): Promise<UserProjectState>
  listMyProjectApplications(): Promise<ProjectApplication[]>
  reviewApplication(projectId: string, applicationId: string, approve: boolean): Promise<void>
  listTasks(projectId?: string): Promise<ProjectTask[]>
  claimTask(taskId: string): Promise<void>
  submitTask(taskId: string): Promise<void>
  acceptTask(taskId: string): Promise<void>
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
  memberCount?: number
  skills: string[]
  match?: number
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
    members: project.memberCount ?? 0,
    needed: project.neededMembers,
    skills: project.skills,
    // 接口未返回 match 时用占位分，非算法匹配结果
    match: typeof project.match === 'number' ? project.match : 80,
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

const unsupported = () => Promise.reject(new Error('当前数据模式不支持该操作'))

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
  listMyProjectApplications: () => Promise.resolve([]),
  reviewApplication: () => unsupported(),
  listTasks: () => Promise.resolve([]),
  claimTask: () => unsupported(),
  submitTask: () => unsupported(),
  acceptTask: () => unsupported(),
}

const supabaseRepository: ProjectRepository = {
  provider: 'supabase',
  remote: true,
  listProjects: fetchCloudProjects,
  createProject: createCloudProject,
  setSaved: setCloudSaved,
  setApplication: setCloudApplication,
  getUserState: fetchCloudUserState,
  async listMyProjectApplications() {
    if (!supabase) throw new Error('Supabase 未配置')
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) throw new Error('未登录')
    const { data: projects, error: projectError } = await supabase.from('projects').select('id, title').eq('owner_id', userId)
    if (projectError) throw new Error(projectError.message)
    const ids = (projects ?? []).map((project) => project.id)
    if (!ids.length) return []
    const { data, error } = await supabase.from('applications').select('*').in('project_id', ids).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const titles = new Map((projects ?? []).map((project) => [project.id, project.title]))
    return (data ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      projectTitle: titles.get(row.project_id),
      applicantId: row.applicant_id,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    }))
  },
  async reviewApplication(projectId, applicationId, approve) {
    if (!supabase) throw new Error('Supabase 未配置')
    const { error } = await supabase.from('applications').update({
      status: approve ? 'approved' : 'rejected',
    }).eq('id', applicationId).eq('project_id', projectId)
    if (error) throw new Error(error.message)
  },
  async listTasks() { return [] },
  claimTask: () => unsupported(),
  submitTask: () => unsupported(),
  acceptTask: () => unsupported(),
}

function apiRepository(baseUrl: string): ProjectRepository {
  const request = createApiClient({ baseUrl, getAccessToken: async () => getApiAccessToken() })
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
    async listMyProjectApplications() {
      return request<ProjectApplication[]>('/applications/inbox')
    },
    async reviewApplication(_projectId, applicationId, approve) {
      const action = approve ? 'approve' : 'reject'
      await request(`/applications/${encodeURIComponent(applicationId)}/${action}`, { method: 'POST' })
    },
    async listTasks(projectId) {
      const path = projectId ? `/projects/${encodeURIComponent(projectId)}/tasks` : '/tasks'
      return request<ProjectTask[]>(path)
    },
    async claimTask(taskId) { await request(`/tasks/${encodeURIComponent(taskId)}/claim`, { method: 'POST' }) },
    async submitTask(taskId) { await request(`/tasks/${encodeURIComponent(taskId)}/submit`, { method: 'POST' }) },
    async acceptTask(taskId) { await request(`/tasks/${encodeURIComponent(taskId)}/accept`, { method: 'POST' }) },
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

export function createAuthApi(apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()) {
  if (!apiBaseUrl) throw new Error('API 模式需要配置 VITE_API_BASE_URL')
  return createApiClient({ baseUrl: apiBaseUrl, getAccessToken: async () => getApiAccessToken() })
}
