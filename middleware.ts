// API 速率限制中間件 — 防止濫用燒 AI 費用
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TODO: 改用 Vercel KV 或 Upstash Redis 做分散式 rate limit（當前 in-memory Map 在 serverless 環境不生效）
// 每分鐘速率限制（in-memory，適用 Vercel serverless）
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// 每日速率限制（免費工具每 IP 每天 30 次）
const dailyLimit = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
  // 只對 API 路由做速率限制
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('cf-connecting-ip') ||
             'unknown'
  const path = request.nextUrl.pathname
  const key = `${ip}:${path}`
  const now = Date.now()

  // 根據路徑決定每分鐘上限
  let maxPerMinute = 30
  let isFreeApi = false

  if (path.startsWith('/api/free-')) {
    maxPerMinute = 5
    isFreeApi = true
  } else if (path.includes('generate-report') || path.includes('workflows')) {
    maxPerMinute = 2
  } else if (path.includes('search-reports')) {
    maxPerMinute = 10
  }

  // 每分鐘速率檢查
  const entry = rateLimit.get(key)
  if (entry && now < entry.resetTime) {
    if (entry.count >= maxPerMinute) {
      return NextResponse.json(
        { error: '請求過於頻繁，請稍後再試' },
        { status: 429 }
      )
    }
    entry.count++
  } else {
    rateLimit.set(key, { count: 1, resetTime: now + 60_000 })
  }

  // 免費工具每日 30 次限制
  if (isFreeApi) {
    const dailyKey = `${ip}:free:daily`
    const dailyEntry = dailyLimit.get(dailyKey)
    const oneDayMs = 86_400_000
    if (dailyEntry && now < dailyEntry.resetTime) {
      if (dailyEntry.count >= 30) {
        return NextResponse.json(
          { error: '今日免費使用次數已達上限，請明天再試' },
          { status: 429 }
        )
      }
      dailyEntry.count++
    } else {
      dailyLimit.set(dailyKey, { count: 1, resetTime: now + oneDayMs })
    }
  }

  // 定期清理過期 entries（約每 100 次請求清一次）
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimit.entries()) {
      if (now > v.resetTime) rateLimit.delete(k)
    }
    for (const [k, v] of dailyLimit.entries()) {
      if (now > v.resetTime) dailyLimit.delete(k)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
