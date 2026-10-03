import { describe, expect, it } from 'vitest'
import { formatMember, statusLabel, statusTone } from './logic'

describe('「我的队伍」statusTone', () => {
  it('已关闭 → closed', () => expect(statusTone('closed')).toBe('closed'))
  it('草稿 → draft', () => expect(statusTone('draft')).toBe('draft'))
  it('招募中或未知/缺省 → open', () => {
    expect(statusTone('open')).toBe('open')
    expect(statusTone(undefined)).toBe('open')
  })
})

describe('「我的队伍」statusLabel', () => {
  it('已关闭 → 已关闭', () => expect(statusLabel('closed')).toBe('已关闭'))
  it('草稿 → 草稿', () => expect(statusLabel('draft')).toBe('草稿'))
  it('招募中或未知/缺省 → 招募中', () => {
    expect(statusLabel('open')).toBe('招募中')
    expect(statusLabel(undefined)).toBe('招募中')
  })
})

describe('「我的队伍」formatMember', () => {
  it('有学校与专业时拼接完整', () => {
    expect(formatMember({ userId: 'u1', role: 'owner', user: { displayName: '张同学', school: '冶金学院', major: '冶金工程' } }))
      .toBe('张同学 · owner · 冶金学院 冶金工程')
  })
  it('缺省显示名时回退到 userId', () => {
    expect(formatMember({ userId: 'u1', role: 'member', user: { displayName: '', school: '冶金学院', major: '' } }))
      .toBe('u1 · member · 冶金学院')
  })
  it('缺学校时兜底为学校待完善', () => {
    expect(formatMember({ userId: 'u1', role: 'member', user: { displayName: '李同学', school: '', major: '软件工程' } }))
      .toBe('李同学 · member · 学校待完善 软件工程')
  })
})