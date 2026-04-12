// API 速率限制中間件 — 防止濫用燒 AI 費用
// 使用 in-memory Map：Vercel Edge 每個區域共用同一進程，
// 單實例內的 Map 已能有效防禦單一 IP 的短時間爆量請求。
// 對於分散式場景（多區域部署），可未來升級至 Upstash Redis。
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 每分鐘速率限制
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// 每日速率限制（免費工具每 IP 每天 30 次）
const dailyLimit = new Map<string, { count: number; resetTime: number }>()

// 從 Vercel/Cloudflare 取得真實 IP（按可靠度排序）
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export function middleware(request: NextRequest) {
  // 只對 API 路由做速率限制
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const ip = getClientIp(request)
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
  let currentCount = 1
  let resetTime = now + 60_000

  if (entry && now < entry.resetTime) {
    if (entry.count >= maxPerMinute) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json(
        { error: '請求過於頻繁，請稍後再試' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxPerMinute),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
          },
        },
      )
    }
    entry.count++
    currentCount = entry.count
    resetTime = entry.resetTime
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
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((dailyEntry.resetTime - now) / 1000)),
              'X-RateLimit-Limit': '30',
              'X-RateLimit-Remaining': '0',
            },
          },
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

  // 加上速率限制回應標頭，方便前端偵錯
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(maxPerMinute))
  response.headers.set('X-RateLimit-Remaining', String(Math.max(maxPerMinute - currentCount, 0)))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
