import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, Filter, Heart, Menu, Plus, Search, ShieldCheck, Users, X } from 'lucide-react'
import { filterPosts, formatMember, parseSkills, statusLabel, statusTone, toggleId, validatePublishForm } from './logic'
import { dataProvider, isRemoteProjectId, isRemoteProvider, projectRepository, type ApplicationForm, type ProjectApplication, type ProjectMember, type ProjectTask } from './lib/repository'
import { AccountButton, AuthModal, useAuthSession } from './components/Auth'
import type { Post, PostId, PublishForm } from './types'

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

function loadIds(key: string): PostId[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as PostId[]
  } catch {
    return []
  }
}

const emptyApplicationForm: ApplicationForm = {
  roleTags: [],
  experience: '',
  availability: '每周 5–8 小时',
  fitReason: '',
  links: [],
  note: '',
}

function App() {
  const [userPosts, setUserPosts] = useState<Post[]>(loadPosts)
  const [category, setCategory] = useState('全部类型')
  const [goal, setGoal] = useState('全部目标')
  const [time, setTime] = useState('全部投入')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<PostId>(demoPosts[0].id)
  const [showPublish, setShowPublish] = useState(false)
  const [showApplication, setShowApplication] = useState(false)
  const [applicationForm, setApplicationForm] = useState<ApplicationForm>(emptyApplicationForm)
  const [applicationError, setApplicationError] = useState('')
  const [form, setForm] = useState<PublishForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [appliedIds, setAppliedIds] = useState<PostId[]>(() => loadIds('saiban:applied-posts'))
  const [savedIds, setSavedIds] = useState<PostId[]>(() => loadIds('saiban:saved-posts'))
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [cloudLoading, setCloudLoading] = useState(isRemoteProvider)
  const [ownedApplications, setOwnedApplications] = useState<ProjectApplication[]>([])
  const [applicationsError, setApplicationsError] = useState('')
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [workspaceTasks, setWorkspaceTasks] = useState<ProjectTask[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<{ userId: string; role: string; user: { displayName: string; school: string; major: string } }[]>([])
  const [myProjects, setMyProjects] = useState<Post[]>([])
  const [myProjectsLoading, setMyProjectsLoading] = useState(false)
  const [myTeamMembers, setMyTeamMembers] = useState<Record<string, ProjectMember[]>>({})
  const [myTeamError, setMyTeamError] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [taskActionLoading, setTaskActionLoading] = useState('')
  const [tasksError, setTasksError] = useState('')
  const { session, loading: authLoading } = useAuthSession()
  const showOwnerApplications = isRemoteProvider && dataProvider !== 'local'

  const requireAccount = (action: () => void) => {
    if (isRemoteProvider && !session) {
      setShowAuth(true)
      return
    }
    action()
  }

  const posts = useMemo(() => [...userPosts, ...demoPosts], [userPosts])
  const selected = posts.find((post) => post.id === selectedId) ?? null
  const filtered = useMemo(() => {
    const matched = filterPosts(posts, category, goal, time, query)
    return showSavedOnly ? matched.filter((post) => savedIds.includes(post.id)) : matched
  }, [posts, category, goal, time, query, showSavedOnly, savedIds])

  useEffect(() => {
    if (!isRemoteProvider) return
    setCloudLoading(true)
    projectRepository.listProjects()
      .then((projects) => {
        setUserPosts(projects)
        if (projects[0]) setSelectedId(projects[0].id)
      })
      .catch((error: Error) => setCloudError(`项目加载失败：${error.message}`))
      .finally(() => setCloudLoading(false))
  }, [])

  useEffect(() => {
    if (!session?.user || !isRemoteProvider) return
    projectRepository.getUserState(session.user.id)
      .then(({ savedIds: saved, appliedIds: applied }) => {
        setSavedIds(saved)
        setAppliedIds(applied)
      })
      .catch((error: Error) => setCloudError(`账号数据加载失败：${error.message}`))
  }, [session?.user])

  useEffect(() => {
    if (!showOwnerApplications || !session?.user) {
      setOwnedApplications([])
      setApplicationsError('')
      return
    }
    setApplicationsLoading(true)
    projectRepository.listMyProjectApplications()
      .then((rows) => {
        setOwnedApplications(rows)
        setApplicationsError('')
      })
      .catch((error: Error) => {
        setOwnedApplications([])
        setApplicationsError(`申请列表加载失败：${error.message}`)
      })
      .finally(() => setApplicationsLoading(false))
  }, [session?.user, showOwnerApplications])

  useEffect(() => {
    if (!isRemoteProvider || dataProvider === 'local') return
    projectRepository.listTasks()
      .then((tasks) => {
        setWorkspaceTasks(tasks)
        setTasksError('')
      })
      .catch((error: Error) => {
        setWorkspaceTasks([])
        setTasksError(`任务加载失败：${error.message}`)
      })
  }, [])

  // 登录后加载「我的队伍」（含已满员/已关闭的项目），供工作台绑定
  useEffect(() => {
    if (!isRemoteProvider || dataProvider === 'local') return
    if (!session?.user) {
      setMyProjects([])
      setWorkspaceMembers([])
      return
    }
    let cancelled = false
    setMyProjectsLoading(true)
    projectRepository.listMyProjects(session.user.id)
      .then((projects) => {
        if (cancelled) return
        setMyProjects(projects)
      })
      .catch(() => { if (!cancelled) setMyProjects([]) })
      .finally(() => { if (!cancelled) setMyProjectsLoading(false) })
    return () => { cancelled = true }
  }, [session?.user])

  // 「我的队伍」：为每个项目并行拉取成员名单
  useEffect(() => {
    if (!isRemoteProvider || dataProvider === 'local' || !myProjects.length) {
      setMyTeamMembers({})
      setMyTeamError('')
      return
    }
    let cancelled = false
    setMyTeamError('')
    Promise.all(myProjects.map(async (project) => {
      const id = project.id as string
      try {
        const members = await projectRepository.listMembers(id)
        return { id, members }
      } catch (error) {
        return { id, members: [], error: error instanceof Error ? error.message : '未知错误' }
      }
    })).then((rows) => {
      if (cancelled) return
      const mapped: Record<string, ProjectMember[]> = {}
      const failures: string[] = []
      rows.forEach((row) => {
        mapped[row.id] = row.members
        if ('error' in row && row.error) failures.push(row.error)
      })
      setMyTeamMembers(mapped)
      if (failures.length) setMyTeamError(`部分队伍成员加载失败：${failures[0]}`)
    })
    return () => { cancelled = true }
  }, [session?.user, myProjects, isRemoteProvider])

  // 工作台绑定项目：优先「我的队伍」里第一个（含 closed），否则退回发现流选中
  useEffect(() => {
    if (!isRemoteProvider) return
    const myProjectId = myProjects[0] ? myProjects[0].id as string : undefined
    const remoteProjects = posts.filter((post) => isRemoteProjectId(post.id))
    const currentIsRemote = selected && isRemoteProjectId(selected.id)
    if (!currentIsRemote && remoteProjects.length > 0) {
      setSelectedId(remoteProjects[0].id)
    }
    const projectId = myProjectId ?? ((selected && isRemoteProjectId(selected.id)) ? selected.id : (remoteProjects[0]?.id as string | undefined))
    if (!projectId) {
      setWorkspaceMembers([])
      return
    }
    projectRepository.listMembers(projectId).then(setWorkspaceMembers).catch(() => setWorkspaceMembers([]))
  }, [selected?.id, session?.user, posts, myProjects])

  // 登录状态恢复后重新拉取成员，避免刷新时序导致空列表
  useEffect(() => {
    if (!isRemoteProvider || dataProvider === 'local') return
    const myProjectId = myProjects[0] ? myProjects[0].id as string : undefined
    const projectId = myProjectId ?? ((selected && isRemoteProjectId(selected.id)) ? selected.id : undefined)
    if (projectId && session?.user) {
      projectRepository.listMembers(projectId).then(setWorkspaceMembers).catch(() => setWorkspaceMembers([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user])

  const createWorkspaceTask = async () => {
    const myProjectId = myProjects[0] ? myProjects[0].id as string : undefined
    const projectId = myProjectId ?? ((selected && isRemoteProjectId(selected.id)) ? selected.id : undefined)
    if (!projectId || !newTaskTitle.trim()) return
    setTaskActionLoading('create')
    try {
      const task = await projectRepository.createTask(projectId, newTaskTitle)
      setWorkspaceTasks((current) => [...current, task])
      setNewTaskTitle('')
    } catch (error) {
      setTasksError(`任务创建失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setTaskActionLoading('')
    }
  }

  const updateWorkspaceTask = async (task: ProjectTask, action: 'claim' | 'submit' | 'accept') => {
    setTaskActionLoading(task.id)
    try {
      if (action === 'claim') await projectRepository.claimTask(task.id)
      if (action === 'submit') await projectRepository.submitTask(task.id)
      if (action === 'accept') await projectRepository.acceptTask(task.id)
      const tasks = await projectRepository.listTasks()
      setWorkspaceTasks(tasks)
    } catch (error) {
      setTasksError(`任务操作失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setTaskActionLoading('')
    }
  }

  useEffect(() => {
    if (!showPublish) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPublish(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showPublish])

  const toggleSaved = async (id: PostId) => {
    const updatedIds = toggleId(savedIds, id)
    if (isRemoteProvider && session?.user && isRemoteProjectId(id)) {
      try {
        await projectRepository.setSaved(session.user.id, id, !savedIds.includes(id))
      } catch (error) {
        setCloudError(`收藏更新失败：${error instanceof Error ? error.message : '未知错误'}`)
        return
      }
    } else {
      localStorage.setItem('saiban:saved-posts', JSON.stringify(updatedIds))
    }
    setSavedIds(updatedIds)
  }

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    if (!applicationForm.roleTags.length || applicationForm.experience.trim().length < 60 || applicationForm.fitReason.trim().length < 40) {
      setApplicationError('请补全想加入的方向、相关经历和适配理由。')
      return
    }
    try {
      if (isRemoteProvider && session?.user && isRemoteProjectId(selected.id)) {
        await projectRepository.setApplication(session.user.id, selected.id, {
          ...applicationForm,
          experience: applicationForm.experience.trim(),
          fitReason: applicationForm.fitReason.trim(),
          links: applicationForm.links.map((link) => link.trim()).filter(Boolean),
          note: applicationForm.note.trim(),
        })
      } else {
        localStorage.setItem('saiban:applied-posts', JSON.stringify(toggleId(appliedIds, selected.id)))
      }
      setAppliedIds((current) => current.includes(selected.id) ? current : [...current, selected.id])
      setShowApplication(false)
      setApplicationForm(emptyApplicationForm)
      setApplicationError('')
    } catch (error) {
      setApplicationError(`申请提交失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const withdrawApplication = async (id: PostId) => {
    try {
      if (isRemoteProvider && session?.user && isRemoteProjectId(id)) await projectRepository.setApplication(session.user.id, id, null)
      else localStorage.setItem('saiban:applied-posts', JSON.stringify(appliedIds.filter((item) => item !== id)))
      setAppliedIds((current) => current.filter((item) => item !== id))
    } catch (error) {
      setCloudError(`撤回申请失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const reviewOwnedApplication = async (application: ProjectApplication, approve: boolean) => {
    try {
      await projectRepository.reviewApplication(application.projectId, application.id, approve)
      setOwnedApplications((current) => current.map((item) => item.id === application.id ? { ...item, status: approve ? 'approved' : 'rejected' } : item))
      setApplicationsError('')
    } catch (error) {
      setApplicationsError(`${approve ? '通过' : '拒绝'}失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const publishPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const error = validatePublishForm(form)
    if (error) {
      setFormError(error)
      return
    }
    let newPost: Post
    if (isRemoteProvider && session?.user) {
      try {
        newPost = await projectRepository.createProject(session.user, form)
      } catch (error) {
        setFormError(`发布失败：${error instanceof Error ? error.message : '未知错误'}`)
        return
      }
    } else {
      newPost = {
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
        skills: parseSkills(form.skills),
        match: 100,
        accent: 'lime',
      }
    }

    const updatedPosts = [newPost, ...userPosts]
    if (!isRemoteProvider) localStorage.setItem('saiban:user-posts', JSON.stringify(updatedPosts))
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
        <a href="#applications" onClick={() => setMobileMenuOpen(false)}>我收到的申请</a>
      </nav>
      <div className="top-actions">
        <button className="icon-button mobile-menu" aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <AccountButton email={session?.user.email} loading={authLoading} onLogin={() => setShowAuth(true)} />
        <button className="primary-button small" onClick={() => requireAccount(() => setShowPublish(true))}><Plus size={17} />发布组队帖</button>
      </div>
    </header>

    <main id="top">
      <section className="hero reveal">
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />TEAM UP / ALIGN FIRST</p><h1>找到一起<br /><em>认真参赛</em>的人。</h1><p className="hero-sub">把缺口、目标和投入写清楚，再投出一份让队长看得懂的加入申请。</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById('teams')?.scrollIntoView({ behavior: 'smooth' })}>开始找队友 <ArrowUpRight size={18} /></button><button className="text-button" onClick={() => requireAccount(() => setShowPublish(true))}>我是队长，我要建队 <span>↗</span></button></div></div>
        <div className="hero-signal"><div className="signal-label"><span className="live-dot" />组队前先对齐</div><div className="signal-number">3<span>项</span></div><div className="signal-caption">缺什么人、冲什么目标、
每周能投入多久</div><div className="signal-stamp">SAIBAN
TEAM MATCHING</div></div>
      </section>


      <section className="teams-section" id="teams">
        <div className="section-heading reveal"><div><p className="eyebrow">01 / DISCOVER</p><h2>现在，<span>谁在找队友？</span></h2></div><div className="heading-side">每张组队帖都写清楚目标、缺口和投入。<br />先对齐，再一起出发。</div></div>
        <div className="local-notice"><ShieldCheck size={16} /><span>{isRemoteProvider ? cloudLoading ? '正在连接云端项目…' : `云端模式：账号、项目、收藏和申请由 ${dataProvider === 'api' ? '后端 API' : 'Supabase'} 安全保存。` : '本地演示模式：发布、收藏和申请仅保存在当前浏览器。配置 Supabase 后可启用云端账号。'}</span></div>
        {cloudError && <p className="form-error cloud-error" role="alert">{cloudError}</p>}
        <div className="toolbar reveal"><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、技能或关键词" aria-label="搜索项目" /></div><div className="filters"><button className={`saved-filter ${showSavedOnly ? 'active' : ''}`} aria-pressed={showSavedOnly} onClick={() => requireAccount(() => setShowSavedOnly((visible) => !visible))}><Heart size={16} fill={showSavedOnly ? 'currentColor' : 'none'} />我的收藏{savedIds.length ? ` ${savedIds.length}` : ''}</button><Filter size={17} /><Select label="竞赛类型" value={category} onChange={setCategory} options={['全部类型', '科创', '仿真', '创意']} /><Select label="目标层级" value={goal} onChange={setGoal} options={['全部目标', '冲击国赛', '稳定获奖', '冲击省赛', '探索体验']} /><Select label="时间投入" value={time} onChange={setTime} options={['全部投入', '每周 8h+', '每周 5-8h', '每周 5h', '每周 3-5h']} /></div></div>
        <div className="content-grid">
          <div className="post-list">{filtered.length ? filtered.map((post, index) => <PostCard key={post.id} post={post} index={index} active={selected?.id === post.id} onClick={() => setSelectedId(post.id)} />) : <div className="empty-state"><Search size={28} /><h3>{showSavedOnly ? '还没有收藏项目' : '没有找到匹配的队伍'}</h3><p>{showSavedOnly ? '点击项目详情右上角的爱心即可收藏。' : '试试换一个技能或目标关键词。'}</p></div>}</div>
          <aside className="detail-panel reveal" aria-live="polite">{selected ? <><div className={`detail-top ${selected.accent}`}><div className="detail-meta"><span>{selected.category}</span><span>{selected.created}</span></div><button className={`save-button ${savedIds.includes(selected.id) ? 'saved' : ''}`} aria-label={savedIds.includes(selected.id) ? '取消收藏' : '收藏项目'} aria-pressed={savedIds.includes(selected.id)} onClick={() => requireAccount(() => toggleSaved(selected.id))}><Heart size={20} fill={savedIds.includes(selected.id) ? 'currentColor' : 'none'} /></button><h3>{selected.title}</h3></div><div className="detail-body"><p>{selected.description}</p><div className="detail-facts"><Fact icon={<Users size={17} />} label="队伍规模" value={`${selected.members} 人在队 · 还缺 ${selected.needed} 人`} /><Fact icon={<Clock3 size={17} />} label="时间投入" value={selected.time} /><Fact icon={<CalendarDays size={17} />} label="项目节奏" value="本周开始 · 预计 8 周" /></div><div className="detail-skills"><span>正在寻找</span>{selected.skills.map((skill) => <b key={skill}>{skill}</b>)}</div><button className={`primary-button join-button ${appliedIds.includes(selected.id) ? 'joined' : ''}`} onClick={() => requireAccount(() => appliedIds.includes(selected.id) ? void withdrawApplication(selected.id) : (setApplicationForm({ ...emptyApplicationForm, roleTags: selected.skills.slice(0, 3) }), setShowApplication(true)))}>{appliedIds.includes(selected.id) ? <><Check size={18} />已投递，点击撤回</> : <>填写加入申请 <ArrowUpRight size={18} /></>}</button><p className="privacy-note"><ShieldCheck size={14} /> 联系方式仅在双方确认后开放</p></div></> : <div className="empty-detail">选择一张组队帖查看详情</div>}</aside>
        </div>
      </section>
      {showOwnerApplications && session?.user && <section className="teams-section reveal" id="applications">
        <div className="section-heading"><div><p className="eyebrow">02 / APPLICATIONS</p><h2>我发布的申请</h2></div><div className="heading-side">仅展示你作为队长收到的申请。审核失败会显示错误，不会伪装成功。</div></div>
        {applicationsLoading && <p className="privacy-note">正在加载申请…</p>}
        {applicationsError && <p className="form-error cloud-error" role="alert">{applicationsError}</p>}
        {!applicationsLoading && !applicationsError && !ownedApplications.length && <p className="privacy-note">暂时没有待处理申请。</p>}
        <ul className="application-list">
          {ownedApplications.map((application) => (
            <li key={application.id} className="application-row">
              <div>
                <strong>{application.projectTitle ?? application.projectId}</strong>
                <p>{application.applicant?.displayName || application.applicantId || '申请人'} · {application.availability} · 想加入：{application.roleTags.join('、')}</p>
                <p>{application.experience}</p>
                <p>适配理由：{application.fitReason}{application.links.length ? ` · 材料：${application.links.join('、')}` : ''}{application.note ? ` · 补充：${application.note}` : ''}</p>
              </div>
              {application.status === 'pending' && <div className="application-actions">
                <button type="button" className="primary-button small" onClick={() => void reviewOwnedApplication(application, true)}>通过</button>
                <button type="button" className="ghost-button" onClick={() => void reviewOwnedApplication(application, false)}>拒绝</button>
              </div>}
            </li>
          ))}
        </ul>
      </section>}

      <section className="teams-section reveal" id="my-teams">
        <div className="section-heading"><div><p className="eyebrow">02 / MY TEAMS</p><h2>我的队伍</h2></div><div className="heading-side">包含你已参与的所有项目，含已关闭项；成员名单实时取自云端。</div></div>
        {!isRemoteProvider || dataProvider === 'local' ? <p className="privacy-note">本地演示模式没有云端队伍数据。</p> : !session?.user ? <p className="privacy-note">登录后即可查看你参与的项目。</p> : myProjectsLoading ? <p className="privacy-note">正在加载你的队伍…</p> : !myProjects.length ? <p className="privacy-note">你还没有参与任何项目，先去「发现队伍」加入一个吧。</p> : <>
          {myTeamError && <p className="form-error cloud-error" role="alert">{myTeamError}</p>}
          <div className="team-grid">
            {myProjects.map((project) => (
              <article key={project.id} className="team-card">
                <div className="team-card-head"><span className={`team-status ${statusTone(project.status)}`}>{statusLabel(project.status)}</span><span className="team-time">{project.created}</span></div>
                <h3>{project.title}</h3>
                <p className="team-meta"><Users size={15} />{project.members}/{project.members + project.needed} 人 · {project.time}</p>
                <p className="team-meta">{project.owner ? <>队长：{project.owner.displayName || '待补充'} · {project.owner.school || '学校待完善'} {project.owner.major || ''}</> : '队长待补充'}</p>
                <div className="post-tags">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <div className="member-list team-members"><h4>成员名单</h4>{(myTeamMembers[project.id as string] ?? []).length ? myTeamMembers[project.id as string].map((member) => <p key={member.userId}>{formatMember(member)}</p>) : <p>成员加载中…</p>}</div>
              </article>
            ))}
          </div>
        </>}
      </section>

      <section className="bottom-callout reveal"><div><p className="eyebrow">05 / MAKE IT REAL</p><h2>你有一个想法，<br /><i>还差几个靠谱的人。</i></h2></div><button className="primary-button" onClick={() => requireAccount(() => setShowPublish(true))}>发布你的组队需求 <Plus size={18} /></button></section>
    </main>

    <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    {showApplication && selected && <div className="modal-backdrop" onMouseDown={() => setShowApplication(false)}><form className="publish-modal" onSubmit={submitApplication} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close-button" onClick={() => setShowApplication(false)} aria-label="关闭"><X size={20} /></button><p className="eyebrow">JOIN APPLICATION / 01</p><h2>用一份简短申请<br /><em>说明你能带来什么。</em></h2><p className="modal-copy">投给「{selected.title}」。只收集队长判断是否适合组队所需的信息。</p><label>想加入的角色或贡献方向 *<input value={applicationForm.roleTags.join('，')} onChange={(event) => setApplicationForm({ ...applicationForm, roleTags: event.target.value.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 3) })} placeholder="例如：数据分析，答辩材料" maxLength={120} /></label><label>相关经历或可证明能力 *<textarea value={applicationForm.experience} onChange={(event) => setApplicationForm({ ...applicationForm, experience: event.target.value })} placeholder="写清做过什么、产出过什么；60–200 字" rows={4} minLength={60} maxLength={200} /><small>{applicationForm.experience.length}/200</small></label><label>稳定可投入时间 *<Select label="稳定可投入时间" value={applicationForm.availability} onChange={(availability) => setApplicationForm({ ...applicationForm, availability: availability as ApplicationForm['availability'] })} options={['每周 3–5 小时', '每周 5–8 小时', '每周 8 小时以上']} /></label><label>为什么适合这个队 *<textarea value={applicationForm.fitReason} onChange={(event) => setApplicationForm({ ...applicationForm, fitReason: event.target.value })} placeholder="结合这个队伍的目标、缺口或项目阶段；40–120 字" rows={3} minLength={40} maxLength={120} /><small>{applicationForm.fitReason.length}/120</small></label><label>作品或材料链接（选填，最多 2 条）<textarea value={applicationForm.links.join('\n')} onChange={(event) => setApplicationForm({ ...applicationForm, links: event.target.value.split('\n').filter(Boolean).slice(0, 2) })} placeholder="每行一个链接" rows={2} maxLength={400} /></label><label>补充说明（选填）<textarea value={applicationForm.note} onChange={(event) => setApplicationForm({ ...applicationForm, note: event.target.value })} placeholder="例如可参与的具体时段" rows={2} maxLength={120} /></label>{applicationError && <p className="form-error" role="alert">{applicationError}</p>}<button type="submit" className="primary-button">提交加入申请 <ArrowUpRight size={18} /></button></form></div>}
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
