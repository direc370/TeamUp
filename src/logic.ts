import type { Post, PublishForm } from './types'

export function parseSkills(value: string): string[] {
  return value.split(/[,，、\s]+/).map((skill) => skill.trim()).filter(Boolean).slice(0, 5)
}

export function validatePublishForm(form: PublishForm): string {
  if (form.title.trim().length < 4) return '项目名称至少填写 4 个字。'
  if (form.description.trim().length < 10) return '请用至少 10 个字说明队友缺口和协作要求。'
  if (!parseSkills(form.skills).length) return '请至少填写一个需要的技能。'
  return ''
}

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

export function filterPosts(posts: Post[], category: string, goal: string, time: string, query: string): Post[] {
  const normalizedQuery = query.trim().toLowerCase()
  return posts.filter((post) => {
    const textMatch = `${post.title} ${post.description} ${post.skills.join(' ')}`.toLowerCase().includes(normalizedQuery)
    return textMatch && (category === '全部类型' || post.category === category) && (goal === '全部目标' || post.goal === goal) && (time === '全部投入' || post.time === time)
  })
}
