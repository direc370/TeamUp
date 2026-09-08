import type { Session } from '@supabase/supabase-js'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowUpRight, LogOut, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthModalProps = {
  open: boolean
  onClose: () => void
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
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
    if (!supabase) {
      setMessage('当前未配置 Supabase，请先填写 .env.local。')
      return
    }
    if (!email.trim() || password.length < 6) {
      setMessage('请输入有效邮箱，密码至少 6 位。')
      return
    }

    setSubmitting(true)
    setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password })
    setSubmitting(false)

    if (result.error) {
      setMessage(result.error.message)
      return
    }
    if (mode === 'register' && !result.data.session) {
      setMessage('注册成功，请前往邮箱完成验证后登录。')
      return
    }
    onClose()
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="publish-modal auth-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} aria-label={mode === 'login' ? '登录赛伴' : '注册赛伴'}>
      <button type="button" className="close-button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
      <p className="eyebrow">ACCOUNT / SAIBAN</p>
      <h2>{mode === 'login' ? '欢迎回来。' : '加入赛伴。'}</h2>
      <p className="modal-copy">{mode === 'login' ? '登录后可发布、收藏和申请项目。' : '使用常用邮箱创建账号，验证后即可参与组队。'}</p>
      <label>邮箱<input autoFocus type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
      <label>密码<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" minLength={6} /></label>
      {message && <p className="form-error" role="alert">{message}</p>}
      <button type="submit" className="primary-button" disabled={submitting}>{submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'} <ArrowUpRight size={18} /></button>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage('') }}>{mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}</button>
    </form>
  </div>
}

export function AccountButton({ email, loading, onLogin }: { email?: string; loading: boolean; onLogin: () => void }) {
  if (loading) return <button className="ghost-button" disabled>检查会话…</button>
  if (!email) return <button className="ghost-button" onClick={onLogin}>登录</button>
  return <button className="ghost-button account-button" onClick={() => supabase?.auth.signOut()} title={email}><span>{email.split('@')[0]}</span><LogOut size={15} /></button>
}
