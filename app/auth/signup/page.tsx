'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">&#9993;</div>
          <h2 className="text-xl font-bold text-white mb-2">請查看 Email</h2>
          <p className="text-sm text-text-muted">我們已寄出驗證信到 <span className="text-gold">{form.email}</span>，請點擊信中連結完成註冊。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-white mb-2">建立帳號</h1>
        <p className="text-center text-text-muted text-sm mb-8">開始你的命理探索之旅</p>

        <form onSubmit={handleSignup} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">姓名</label>
            <input type="text" required placeholder="你的姓名"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Email</label>
            <input type="email" required placeholder="your@email.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">密碼</label>
            <input type="password" required placeholder="至少6個字元" minLength={6}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none" />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gold text-dark font-bold rounded-xl btn-glow disabled:opacity-50">
            {loading ? '註冊中...' : '免費註冊'}
          </button>
          <p className="text-[10px] text-text-muted/60 text-center">
            註冊即表示同意<a href="/terms" className="text-gold">使用條款</a>和<a href="/privacy" className="text-gold">隱私政策</a>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          已有帳號？ <a href="/auth/login" className="text-gold hover:underline">登入</a>
        </p>
      </div>
    </div>
  )
}
