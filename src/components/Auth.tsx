import type { Session } from '@supabase/supabase-js'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowUpRight, LogOut, X } from 'lucide-react'
import { ApiError } from '../lib/api'
import { clearApiSession, persistAuthTokens, readApiSession, subscribeApiSession, type AppSession, type ApiAuthUser } from '../lib/auth-session'
import { createAuthApi, dataProvider } from '../lib/repository'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthModalProps = {
  open: boolean
  onClose: () => void
}

function toAppSession(user: { id: string; email?: string | null } | null | undefined): AppSession | null {
  if (!user?.id || !user.email) return null
  return { user: { id: user.id, email: user.email } }
}

export function useAuthSession() {
  const [session, setSession] = useState<AppSession | null>(() => dataProvider === 'api' ? readApiSession() : null)
  const [loading, setLoading] = useState(dataProvider === 'supabase' ? isSupabaseConfigured : dataProvider === 'api')

  useEffect(() => {
    if (dataProvider === 'api') {
      setSession(readApiSession())
      setLoading(false)
      return subscribeApiSession((next) => setSession(next))
    }
    if (dataProvider !== 'supabase' || !supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(toAppSession(data.session?.user))
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession: Session | null) => {
      setSession(toAppSession(nextSession?.user))
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const minPassword = dataProvider === 'api' ? 8 : 6

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (dataProvider === 'local') {
      setMessage('本地演示模式无需登录。')
      return
    }
    if (dataProvider === 'supabase' && !supabase) {
      setMessage('当前未配置 Supabase，请先填写 .env.local。')
      return
    }
    if (!email.trim() || password.length < minPassword) {
      setMessage(`请输入有效邮箱，密码至少 ${minPassword} 位。`)
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      if (dataProvider === 'api') {
        const request = createAuthApi()
        const path = mode === 'login' ? '/auth/login' : '/auth/register'
        const payload = await request<{ accessToken: string; refreshToken: string; user: ApiAuthUser }>(path, {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        })
        persistAuthTokens(payload)
        onClose()
        return
      }

      const result = mode === 'login'
        ? await supabase!.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase!.auth.signUp({ email: email.trim(), password })
      if (result.error) {
        setMessage(result.error.message)
        return
      }
      if (mode === 'register' && !result.data.session) {
        setMessage('注册成功，请前往邮箱完成验证后登录。')
        return
      }
      onClose()
    } catch (error) {
      setMessage(error instanceof ApiError || error instanceof Error ? error.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="publish-modal auth-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} aria-label={mode === 'login' ? '登录赛伴' : '注册赛伴'}>
      <button type="button" className="close-button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
      <p className="eyebrow">ACCOUNT / SAIBAN</p>
      <h2>{mode === 'login' ? '欢迎回来。' : '加入赛伴。'}</h2>
      <p className="modal-copy">{mode === 'login' ? '登录后可发布、收藏和申请项目。' : '使用常用邮箱创建账号，验证后即可参与组队。'}</p>
      <label>邮箱<input autoFocus type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
      <label>密码<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={`至少 ${minPassword} 位`} minLength={minPassword} /></label>
      {message && <p className="form-error" role="alert">{message}</p>}
      <button type="submit" className="primary-button" disabled={submitting}>{submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'} <ArrowUpRight size={18} /></button>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage('') }}>{mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}</button>
    </form>
  </div>
}

export function AccountButton({ email, loading, onLogin }: { email?: string; loading: boolean; onLogin: () => void }) {
  const signOut = async () => {
    if (dataProvider === 'api') {
      const session = readApiSession()
      try {
        if (session?.refreshToken) {
          await createAuthApi()('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) })
        }
      } catch {
        // 退出失败仍清理本地会话，避免假登录
      }
      clearApiSession()
      return
    }
    await supabase?.auth.signOut()
  }

  if (loading) return <button className="ghost-button" disabled>检查会话…</button>
  if (!email) return <button className="ghost-button" onClick={onLogin}>登录</button>
  return <button className="ghost-button account-button" onClick={() => void signOut()} title={email}><span>{email.split('@')[0]}</span><LogOut size={15} /></button>
}
