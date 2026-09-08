import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Post, PublishForm } from '../types'
import { parseSkills } from '../logic'

function formatCreated(value: string): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return '刚刚发布'
  if (minutes < 60) return `${minutes} 分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`
  return `${Math.floor(minutes / 1440)} 天前`
}

export async function fetchCloudProjects(): Promise<Post[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    goal: project.goal,
    time: project.weekly_commitment,
    location: project.location,
    created: formatCreated(project.created_at),
    members: 1,
    needed: project.needed_members,
    skills: project.skills,
    match: 80,
    accent: 'lime',
  }))
}

export async function createCloudProject(user: User, form: PublishForm): Promise<Post> {
  if (!supabase) throw new Error('Supabase 未配置')
  const { data, error } = await supabase.from('projects').insert({
    owner_id: user.id,
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    goal: form.goal,
    weekly_commitment: form.time,
    skills: parseSkills(form.skills),
  }).select().single()
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    goal: data.goal,
    time: data.weekly_commitment,
    location: data.location,
    created: '刚刚发布',
    members: 1,
    needed: data.needed_members,
    skills: data.skills,
    match: 100,
    accent: 'lime',
  }
}

export async function setCloudSaved(userId: string, projectId: string, saved: boolean) {
  if (!supabase) throw new Error('Supabase 未配置')
  const result = saved
    ? await supabase.from('saved_projects').insert({ user_id: userId, project_id: projectId })
    : await supabase.from('saved_projects').delete().eq('user_id', userId).eq('project_id', projectId)
  if (result.error) throw new Error(result.error.message)
}

export async function setCloudApplication(userId: string, projectId: string, applied: boolean) {
  if (!supabase) throw new Error('Supabase 未配置')
  const result = applied
    ? await supabase.from('applications').upsert(
        { applicant_id: userId, project_id: projectId, status: 'pending' },
        { onConflict: 'project_id,applicant_id' },
      )
    : await supabase.from('applications').update({ status: 'withdrawn' }).eq('applicant_id', userId).eq('project_id', projectId).eq('status', 'pending')
  if (result.error) throw new Error(result.error.message)
}

export async function fetchCloudUserState(userId: string) {
  if (!supabase) return { savedIds: [] as string[], appliedIds: [] as string[] }
  const [saved, applications] = await Promise.all([
    supabase.from('saved_projects').select('project_id').eq('user_id', userId),
    supabase.from('applications').select('project_id').eq('applicant_id', userId).eq('status', 'pending'),
  ])
  if (saved.error) throw new Error(saved.error.message)
  if (applications.error) throw new Error(applications.error.message)
  return {
    savedIds: saved.data.map((item) => item.project_id),
    appliedIds: applications.data.map((item) => item.project_id),
  }
}
