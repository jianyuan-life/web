'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import LocaleSwitcher from './LocaleSwitcher'
import { getLocale, UI_TEXT } from '@/lib/i18n'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [txt, setTxt] = useState(UI_TEXT['zh-TW'])

  useEffect(() => {
    setTxt(UI_TEXT[getLocale()])
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-gold/10" style={{ background: 'rgba(26,17,10,0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="鑒源 JianYuan" className="h-8" />
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="/#systems" className="text-text-muted hover:text-gold transition-colors">{txt.nav_systems}</a>
          <a href="/pricing" className="text-text-muted hover:text-gold transition-colors">{txt.nav_pricing}</a>
          <a href="/tools/bazi" className="text-text-muted hover:text-gold transition-colors">{txt.nav_free}</a>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {user ? (
            <>
              <a href="/dashboard" className="text-sm text-text-muted hover:text-gold transition-colors">{txt.nav_my_reports}</a>
              <button onClick={handleLogout} className="text-sm text-text-muted/60 hover:text-text-muted transition-colors">{txt.nav_logout}</button>
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                {(user.user_metadata?.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
              </div>
            </>
          ) : (
            <>
              <a href="/auth/login" className="text-sm text-text-muted hover:text-gold transition-colors">{txt.nav_login}</a>
              <a href="/auth/signup" className="px-4 py-2 bg-gold/90 text-dark font-semibold rounded-lg text-sm btn-glow hover:bg-gold">
                {txt.nav_signup}
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
