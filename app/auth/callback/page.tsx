'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // 如果有 pending 的購買方案，跳到結帳頁
        const pendingPlan = sessionStorage.getItem('pending_plan')
        if (pendingPlan) {
          sessionStorage.removeItem('pending_plan')
          window.location.href = `/checkout?plan=${pendingPlan}`
        } else {
          window.location.href = '/dashboard'
        }
      }
    })
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin inline-block">&#9788;</div>
        <p className="text-text-muted">驗證中...</p>
      </div>
    </div>
  )
}
