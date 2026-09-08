import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, Filter, Gauge, Heart, Menu, Plus, Search, ShieldCheck, Users, X } from 'lucide-react'
import { filterPosts, parseSkills, toggleId, validatePublishForm } from './logic'
import { isSupabaseConfigured } from './lib/supabase'
import type { Post, PublishForm } from './types'

const demoPosts: Post[] = [
  { id: 1, title: '想组一支认真冲国赛的智能质检队', category: '科创', goal: '冲击国赛', time: '每周 8h+', location: '冶金学院 · 可线上', created: '12 分钟前', members: 3, needed: 2, skills: ['Python', '机器学习', '实验设计'], description: '我们已经完成选题和初步调研，正在寻找一位能做视觉算法、一位愿意长期协作的实验同学。目标明确，节奏稳定，拒绝临时拼盘。', match: 94, accent: 'lime' },
  { id: 2, title: '材料创新赛｜缺一位会建模的队友', category: '仿真', goal: '稳定获奖', time: '每周 5-8h', location: '不限专业 · 混合协作', created: '36 分钟前', members: 2, needed: 1, skills: ['COMSOL', '建模', '材料学'], description: '方向是低碳冶金流程优化，已经有指导老师和数据基础。希望你不怕从零搭模型，能一起把事情做完。', match: 87, accent: 'orange' },
  { id: 3, title: '从一个好点子开始：AI + 冶金交叉', category: '创意', goal: '探索体验', time: '每周 3-5h', location: '冶金学院 · 线下优先', created: '1 小时前', members: 1, needed: 3, skills: ['AI应用', 'PPT', '调研'], description: '还没有被框住的答案，只有一个想认真探索的方向。适合愿意一起做用户访谈、找真实问题的同学。', match: 72, accent: 'blue' },
  { id: 4, title: '已有队伍招募文档负责人', category: '科创', goal: '冲击省赛', time: '每周 5h', location: '可线上', created: '2 小时前', members: 4, needed: 1, skills: ['写作', '数据整理', '答辩'], description: '项目进入材料整合期，技术路线已有，希望找一位逻辑清晰、交付靠谱的同学负责文档与答辩材料。', match: 81, accent: 'pink' },
]

const emptyForm: PublishForm = {
  title: '',
  description: '',
  category: '科创',
  goal: '冲击省赛',
  time: '每周 5h',
  skills: '',
}

function loadPosts(): Post[] {
  try {
    return JSON.parse(localStorage.getItem('saiban:user-posts') ?? '[]') as Post[]
  } catch {
    return []
  }
}

function loadIds(key: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as number[]
  } catch {
    return []
  }
}

function App() {
  const [userPosts, setUserPosts] = useState<Post[]>(loadPosts)
  const [category, setCategory] = useState('全部类型')
  const [goal, setGoal] = useState('全部目标')
  const [time, setTime] = useState('全部投入')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number>(demoPosts[0].id)
  const [showPublish, setShowPublish] = useState(false)
  const [form, setForm] = useState<PublishForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [appliedIds, setAppliedIds] = useState<number[]>(() => loadIds('saiban:applied-posts'))
  const [savedIds, setSavedIds] = useState<number[]>(() => loadIds('saiban:saved-posts'))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const posts = useMemo(() => [...userPosts, ...demoPosts], [userPosts])
  const selected = posts.find((post) => post.id === selectedId) ?? null
  const filtered = useMemo(() => filterPosts(posts, category, goal, time, query), [posts, category, goal, time, query])

  useEffect(() => {
    if (!showPublish) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPublish(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showPublish])

  const toggleSaved = (id: number) => {
    const updatedIds = toggleId(savedIds, id)
    localStorage.setItem('saiban:saved-posts', JSON.stringify(updatedIds))
    setSavedIds(updatedIds)
  }

  const toggleApplied = (id: number) => {
    const updatedIds = toggleId(appliedIds, id)
    localStorage.setItem('saiban:applied-posts', JSON.stringify(updatedIds))
    setAppliedIds(updatedIds)
  }

  const publishPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const error = validatePublishForm(form)
    if (error) {
      setFormError(error)
      return
    }
    const skills = parseSkills(form.skills)

    const newPost: Post = {
      id: Date.now(),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      goal: form.goal,
      time: form.time,
      location: '我发布的项目 · 待完善地点',
      created: '刚刚发布',
      members: 1,
      needed: 2,
      skills,
      match: 100,
      accent: 'lime',
    }

    const updatedPosts = [newPost, ...userPosts]
    localStorage.setItem('saiban:user-posts', JSON.stringify(updatedPosts))
    setUserPosts(updatedPosts)
    setSelectedId(newPost.id)
    setCategory('全部类型')
    setGoal('全部目标')
    setTime('全部投入')
    setQuery('')
    setForm(emptyForm)
    setFormError('')
    setShowPublish(false)
    requestAnimationFrame(() => document.getElementById('teams')?.scrollIntoView({ behavior: 'smooth' }))
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="赛伴首页"><span className="brand-mark">S</span><span>赛伴<span className="brand-dot">.</span></span></a>
      <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} aria-label="主导航">
        <a className="active" href="#teams" onClick={() => setMobileMenuOpen(false)}>发现队伍</a>
        <a href="#workspace" onClick={() => setMobileMenuOpen(false)}>协作工作台</a>
        <a href="#ledger" onClick={() => setMobileMenuOpen(false)}>我的贡献账本</a>
      </nav>
      <div className="top-actions">
        <button className="icon-button mobile-menu" aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <button className="ghost-button" title="登录功能将在接入 Supabase 后开放">登录</button>
        <button className="primary-button small" onClick={() => setShowPublish(true)}><Plus size={17} />发布组队帖</button>
      </div>
    </header>

    <main id="top">
      <section className="hero reveal">
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />TEAM UP / RECORD EVERYTHING</p><h1>找到一起<br /><em>认真做事</em>的人。</h1><p className="hero-sub">从组队、分工到交付，每一次靠谱的协作都值得被看见。</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById('teams')?.scrollIntoView({ behavior: 'smooth' })}>开始找队友 <ArrowUpRight size={18} /></button><button className="text-button" onClick={() => setShowPublish(true)}>我是队长，我要建队 <span>↗</span></button></div></div>
        <div className="hero-signal"><div className="signal-label"><span className="live-dot" />本周协作信号</div><div className="signal-number">284<span>条</span></div><div className="signal-caption">正在寻找靠谱队友<br />的真实需求</div><div className="signal-stamp">09 / 2026<br />NENU · METALLURGY</div></div>
      </section>

      <section className="stats-strip reveal"><div><strong>1,248</strong><span>已加入赛伴的同学</span></div><div><strong>{86 + userPosts.length}</strong><span>正在招募的队伍</span></div><div><strong>94%</strong><span>队伍目标一致度</span></div><div className="strip-note">协作不是承诺<br /><b>是留下来的记录。</b></div></section>

      <section className="teams-section" id="teams">
        <div className="section-heading reveal"><div><p className="eyebrow">01 / DISCOVER</p><h2>现在，<span>谁在找队友？</span></h2></div><div className="heading-side">每张组队帖都写清楚目标、缺口和投入。<br />先对齐，再一起出发。</div></div>
        <div className="local-notice"><ShieldCheck size={16} /><span>{isSupabaseConfigured ? '云端配置已连接：账号与数据功能将在下一阶段启用。' : '本地演示模式：发布、收藏和申请仅保存在当前浏览器。配置 Supabase 后可启用云端账号。'}</span></div>
        <div className="toolbar reveal"><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、技能或关键词" aria-label="搜索项目" /></div><div className="filters"><Filter size={17} /><Select label="竞赛类型" value={category} onChange={setCategory} options={['全部类型', '科创', '仿真', '创意']} /><Select label="目标层级" value={goal} onChange={setGoal} options={['全部目标', '冲击国赛', '稳定获奖', '冲击省赛', '探索体验']} /><Select label="时间投入" value={time} onChange={setTime} options={['全部投入', '每周 8h+', '每周 5-8h', '每周 5h', '每周 3-5h']} /></div></div>
        <div className="content-grid">
          <div className="post-list">{filtered.length ? filtered.map((post, index) => <PostCard key={post.id} post={post} index={index} active={selected?.id === post.id} onClick={() => setSelectedId(post.id)} />) : <div className="empty-state"><Search size={28} /><h3>没有找到匹配的队伍</h3><p>试试换一个技能或目标关键词。</p></div>}</div>
          <aside className="detail-panel reveal" aria-live="polite">{selected ? <><div className={`detail-top ${selected.accent}`}><div className="detail-meta"><span>{selected.category}</span><span>{selected.created}</span></div><button className={`save-button ${savedIds.includes(selected.id) ? 'saved' : ''}`} aria-label={savedIds.includes(selected.id) ? '取消收藏' : '收藏项目'} aria-pressed={savedIds.includes(selected.id)} onClick={() => toggleSaved(selected.id)}><Heart size={20} fill={savedIds.includes(selected.id) ? 'currentColor' : 'none'} /></button><h3>{selected.title}</h3><div className="match-line"><Gauge size={16} />你的匹配度 <b>{selected.match}%</b><span className="match-bar"><i style={{ width: `${selected.match}%` }} /></span></div></div><div className="detail-body"><p>{selected.description}</p><div className="detail-facts"><Fact icon={<Users size={17} />} label="队伍规模" value={`${selected.members} 人在队 · 还缺 ${selected.needed} 人`} /><Fact icon={<Clock3 size={17} />} label="时间投入" value={selected.time} /><Fact icon={<CalendarDays size={17} />} label="项目节奏" value="本周开始 · 预计 8 周" /></div><div className="detail-skills"><span>正在寻找</span>{selected.skills.map((skill) => <b key={skill}>{skill}</b>)}</div><button className={`primary-button join-button ${appliedIds.includes(selected.id) ? 'joined' : ''}`} onClick={() => toggleApplied(selected.id)}>{appliedIds.includes(selected.id) ? <><Check size={18} />申请已发送</> : <>我对这个队伍感兴趣 <ArrowUpRight size={18} /></>}</button><p className="privacy-note"><ShieldCheck size={14} /> 联系方式仅在双方确认后开放</p></div></> : <div className="empty-detail">选择一张组队帖查看详情</div>}</aside>
        </div>
      </section>
      <section className="bottom-callout reveal"><div><p className="eyebrow">02 / MAKE IT REAL</p><h2>你有一个想法，<br /><i>还差几个靠谱的人。</i></h2></div><button className="primary-button" onClick={() => setShowPublish(true)}>发布你的组队需求 <Plus size={18} /></button></section>
    </main>

    {showPublish && <div className="modal-backdrop" onMouseDown={() => setShowPublish(false)}><form className="publish-modal" onSubmit={publishPost} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close-button" onClick={() => setShowPublish(false)} aria-label="关闭"><X size={20} /></button><p className="eyebrow">NEW TEAM / 01</p><h2>把你的缺口<br /><em>说清楚。</em></h2><p className="modal-copy">目标越具体，越容易遇到同频的人。带 * 为必填项。</p><label>项目名称 *<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：想组一支认真冲国赛的队伍" maxLength={50} /></label><div className="form-grid"><label>竞赛类型<Select label="竞赛类型" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={['科创', '仿真', '创意']} /></label><label>目标层级<Select label="目标层级" value={form.goal} onChange={(value) => setForm({ ...form, goal: value })} options={['冲击国赛', '稳定获奖', '冲击省赛', '探索体验']} /></label></div><label>每周投入<Select label="每周投入" value={form.time} onChange={(value) => setForm({ ...form, time: value })} options={['每周 8h+', '每周 5-8h', '每周 5h', '每周 3-5h']} /></label><label>需要的技能 *<input value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="用逗号分隔，例如：Python，建模，答辩" maxLength={80} /></label><label>你正在寻找 *<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="需要什么样的队友？目前做到哪一步？希望如何协作？" rows={4} maxLength={300} /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<button type="submit" className="primary-button">发布组队帖 <ArrowUpRight size={18} /></button></form></div>}
    <footer><span>赛伴 / SAIBAN</span><span>协作即存证 · V0.3 本地交互版</span></footer>
  </div>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></span>
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="fact"><span>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>
}

function PostCard({ post, index, active, onClick }: { post: Post; index: number; active: boolean; onClick: () => void }) {
  return <button className={`post-card reveal ${active ? 'active' : ''}`} style={{ '--delay': `${index * 70}ms` } as React.CSSProperties} onClick={onClick}><div className={`post-index ${post.accent}`}>{String(index + 1).padStart(2, '0')}</div><div className="post-main"><div className="post-top"><span className="category-tag">{post.category}</span><span className="post-time">{post.created}</span></div><h3>{post.title}</h3><div className="post-tags">{post.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="post-footer"><span><Users size={15} />{post.members}/{post.members + post.needed} 人</span><span><Clock3 size={15} />{post.time}</span><span className="post-location">{post.location}</span></div></div><ArrowUpRight className="card-arrow" size={20} /></button>
}

export default App
