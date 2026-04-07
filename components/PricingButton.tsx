'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PricingButtonProps {
  code: string
  popular?: boolean
  seasonal?: boolean
  locked?: boolean
}

export default function PricingButton({ code, popular, seasonal, locked }: PricingButtonProps) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
  }, [])

  const handleClick = () => {
    if (seasonal) return
    if (loggedIn) {
      window.location.href = `/checkout?plan=${code}`
    } else {
      sessionStorage.setItem('pending_plan', code)
      window.location.href = '/auth/login'
    }
  }

  const CTA_LABELS: Record<string, string> = {
    C: '開始我的人生藍圖',
    D: '問出心裡的問題',
    G15: '為家庭做一次命格體檢',
    R: '看看我們合不合',
    E1: '為重要時刻做準備',
    E2: '掌握下個月的好時機',
  }

  const label = seasonal
    ? '2027年1月開放'
    : locked
      ? '需先有命格分析'
      : loggedIn
        ? (CTA_LABELS[code] || '選擇此方案')
        : '免費註冊，開始探索'

  return (
    <button
      onClick={handleClick}
      disabled={seasonal}
      className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
        popular ? 'bg-gold text-dark btn-glow' :
        seasonal ? 'bg-white/5 text-text-muted/40 cursor-not-allowed' :
        locked ? 'glass text-gold hover:bg-gold/10' :
        'glass text-cream hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}
