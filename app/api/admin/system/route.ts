import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_KEY || 'jianyuan2026'

type HealthResult = {
  name: string
  status: 'ok' | 'error' | 'warn'
  latency_ms: number
  message: string
}

async function checkService(name: string, fn: () => Promise<string>): Promise<HealthResult> {
  const start = Date.now()
  try {
    const msg = await fn()
    return { name, status: 'ok', latency_ms: Date.now() - start, message: msg }
  } catch (err) {
    return { name, status: 'error', latency_ms: Date.now() - start, message: err instanceof Error ? err.message : '未知錯誤' }
  }
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const checks = await Promise.all([
    // Supabase 連線
    checkService('Supabase', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      )
      const { count, error } = await supabase.from('paid_reports').select('id', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
      return `連線正常，共 ${count ?? 0} 筆報告`
    }),

    // Python API (Fly.io)
    checkService('Fly.io Python API', async () => {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://fortune-reports-api.fly.dev'
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        const res = await fetch(`${url}/health`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return '排盤 API 正常'
      } finally { clearTimeout(timeout) }
    }),

    // Stripe
    checkService('Stripe', async () => {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (!stripeKey) throw new Error('STRIPE_SECRET_KEY 未設定')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        const res = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${stripeKey}` },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const usd = data.available?.find((b: { currency: string }) => b.currency === 'usd')
        return `餘額 $${((usd?.amount || 0) / 100).toFixed(2)} USD`
      } finally { clearTimeout(timeout) }
    }),

    // Resend（用 /emails 端點驗證，sending key 有此權限）
    checkService('Resend', async () => {
      const resendKey = process.env.RESEND_API_KEY
      if (!resendKey) throw new Error('RESEND_API_KEY 未設定')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        // 用 /emails 端點（GET 列出最近郵件），sending key 有此權限
        const res = await fetch('https://api.resend.com/emails', {
          headers: { 'Authorization': `Bearer ${resendKey}` },
          signal: controller.signal,
        })
        if (res.ok) {
          return '郵件服務正常（已驗證 API Key）'
        }
        // 如果 /emails 也不行，嘗試 /api-keys
        const fallbackRes = await fetch('https://api.resend.com/api-keys', {
          headers: { 'Authorization': `Bearer ${resendKey}` },
          signal: controller.signal,
        })
        if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}（API key 可能無效或權限不足）`)
        return 'API 連線正常（域名端點不可用，請到 resend.com 確認域名狀態）'
      } finally { clearTimeout(timeout) }
    }),

    // Vercel（檢查網站本身可達性）
    checkService('Vercel (網站)', async () => {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        const res = await fetch(siteUrl, { signal: controller.signal, method: 'HEAD' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return '網站可達'
      } finally { clearTimeout(timeout) }
    }),
  ])

  // 環境變數檢查
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY',
    'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SITE_URL', 'ADMIN_KEY',
  ]
  const envStatus = envVars.map(v => ({
    name: v,
    set: !!process.env[v],
  }))

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: checks,
    env_vars: envStatus,
    overall: checks.every(c => c.status === 'ok') ? 'healthy' : checks.some(c => c.status === 'error') ? 'unhealthy' : 'degraded',
  })
}
