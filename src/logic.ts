import type { Post, PostId, PublishForm } from './types'

export function parseSkills(value: string): string[] {
  return value.split(/[,，、\s]+/).map((skill) => skill.trim()).filter(Boolean).slice(0, 5)
}

export function validatePublishForm(form: PublishForm): string {
  if (form.title.trim().length < 4) return '项目名称至少填写 4 个字。'
  if (form.description.trim().length < 10) return '请用至少 10 个字说明队友缺口和协作要求。'
  if (!parseSkills(form.skills).length) return '请至少填写一个需要的技能。'
  return ''
}

export function toggleId(ids: PostId[], id: PostId): PostId[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

export function filterPosts(posts: Post[], category: string, goal: string, time: string, query: string): Post[] {
  const normalizedQuery = query.trim().toLowerCase()
  return posts.filter((post) => {
    const textMatch = `${post.title} ${post.description} ${post.skills.join(' ')}`.toLowerCase().includes(normalizedQuery)
    return textMatch && (category === '全部类型' || post.category === category) && (goal === '全部目标' || post.goal === goal) && (time === '全部投入' || post.time === time)
  })
}

/** 「我的队伍」状态徽章的样式色调，缺省按招募中处理 */
export function statusTone(status: string | undefined): 'open' | 'closed' | 'draft' {
  if (status === 'closed') return 'closed'
  if (status === 'draft') return 'draft'
  return 'open'
}

/** 「我的队伍」状态徽章的文案 */
export function statusLabel(status: string | undefined): string {
  if (status === 'closed') return '已关闭'
  if (status === 'draft') return '草稿'
  return '招募中'
}

export type TeamMember = {
  userId: string
  role: string
  user: { displayName: string; school: string; major: string }
}

/** 「我的队伍」成员行文案：名字 · 角色 · 学校 专业 */
export function formatMember(member: TeamMember): string {
  const name = member.user.displayName || member.userId
  const school = member.user.school || '学校待完善'
  const major = member.user.major ? ` ${member.user.major}` : ''
  return `${name} · ${member.role} · ${school}${major}`
}
