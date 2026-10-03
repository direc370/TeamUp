export type PostId = number | string

export type Post = {
  id: PostId
  title: string
  category: string
  goal: string
  time: string
  location: string
  created: string
  members: number
  needed: number
  skills: string[]
  description: string
  match: number
  accent: string
  /** 项目状态（仅云端 API 返回：draft / open / closed），离线数据缺省 */
  status?: string
  /** 队长信息（仅云端 API 返回），离线数据缺省 */
  owner?: { id: string; displayName: string; school: string; major: string }
}

export type UserProjectState = {
  savedIds: string[]
  appliedIds: string[]
}

export type PublishForm = {
  title: string
  description: string
  category: string
  goal: string
  time: string
  skills: string
}
