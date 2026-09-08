import { describe, expect, it } from 'vitest'
import { filterPosts, parseSkills, toggleId, validatePublishForm } from './logic'
import type { Post, PublishForm } from './types'

const posts: Post[] = [
  { id: 1, title: '智能质检项目', category: '科创', goal: '冲击国赛', time: '每周 8h+', location: '线上', created: '刚刚', members: 2, needed: 1, skills: ['Python', '机器学习'], description: '寻找视觉算法方向的长期协作队友', match: 90, accent: 'lime' },
  { id: 2, title: '材料建模项目', category: '仿真', goal: '稳定获奖', time: '每周 5-8h', location: '线下', created: '刚刚', members: 1, needed: 2, skills: ['COMSOL'], description: '负责材料流程仿真和数据分析', match: 80, accent: 'orange' },
]

const validForm: PublishForm = {
  title: '智能车竞赛项目',
  description: '寻找可以长期投入算法开发和调试工作的队友',
  category: '科创',
  goal: '冲击省赛',
  time: '每周 5h',
  skills: 'C++，控制算法 调试',
}

describe('parseSkills', () => {
  it('支持中英文分隔符并限制五项', () => {
    expect(parseSkills('Python，建模、答辩 React 设计,测试')).toEqual(['Python', '建模', '答辩', 'React', '设计'])
  })
})

describe('validatePublishForm', () => {
  it('接受有效表单', () => expect(validatePublishForm(validForm)).toBe(''))
  it('拒绝过短标题', () => expect(validatePublishForm({ ...validForm, title: '项目' })).toContain('至少填写 4 个字'))
  it('拒绝空技能', () => expect(validatePublishForm({ ...validForm, skills: ' ， 、 ' })).toContain('至少填写一个'))
})

describe('toggleId', () => {
  it('添加和移除指定 ID 且不修改原数组', () => {
    const original = [1, 2]
    expect(toggleId(original, 3)).toEqual([1, 2, 3])
    expect(toggleId(original, 2)).toEqual([1])
    expect(original).toEqual([1, 2])
  })
})

describe('filterPosts', () => {
  it('可按技能关键词搜索', () => expect(filterPosts(posts, '全部类型', '全部目标', '全部投入', ' python ')).toEqual([posts[0]]))
  it('组合筛选条件', () => expect(filterPosts(posts, '仿真', '稳定获奖', '每周 5-8h', '')).toEqual([posts[1]]))
  it('无匹配时返回空数组', () => expect(filterPosts(posts, '创意', '全部目标', '全部投入', '')).toEqual([]))
})
