export type Post = {
  id: number
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
}

export type PublishForm = {
  title: string
  description: string
  category: string
  goal: string
  time: string
  skills: string
}
