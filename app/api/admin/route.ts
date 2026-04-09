import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 管理後台 API — 簡單密碼保護
const ADMIN_KEY = process.env.ADMIN_KEY
if (!ADMIN_KEY) {
  console.error('ADMIN_KEY 環境變數未設定！Admin API 無法使用')
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const range = req.nextUrl.searchParams.get('range') || '7d'
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceISO = since.toISOString()
  const supabase = getSupabase()

  // 並行查詢所有數據
  const [
    visitorsRes,
    reportsRes,
    freeToolRes,
    topPagesRes,
    countriesRes,
    devicesRes,
  ] = await Promise.all([
    // 訪客總數（去重 session_id）
    supabase.from('visitor_events').select('session_id', { count: 'exact' }).gte('created_at', sinceISO),
    // 付費報告
    supabase.from('paid_reports').select('*').gte('created_at', sinceISO).order('created_at', { ascending: false }),
    // 免費工具使用
    supabase.from('free_tool_usage').select('*', { count: 'exact' }).gte('created_at', sinceISO),
    // 熱門頁面 Top 10
    supabase.from('visitor_events').select('page_path').gte('created_at', sinceISO),
    // 國家分佈
    supabase.from('visitor_events').select('country').gte('created_at', sinceISO),
    // 設備分佈
    supabase.from('visitor_events').select('device_type').gte('created_at', sinceISO),
  ])

  // 計算統計
  const visitors = visitorsRes.data || []
  const uniqueSessions = new Set(visitors.map(v => v.session_id)).size
  const totalPageviews = visitors.length

  const reports = reportsRes.data || []
  const totalRevenue = reports.reduce((sum, r) => sum + (parseFloat(r.amount_usd) || 0), 0)
  const completedReports = reports.filter(r => r.status === 'completed').length

  // 產品銷售排行
  const planCounts: Record<string, { count: number; revenue: number }> = {}
  for (const r of reports) {
    // 正規化：取第一個英數字段（相容舊資料如「C 全方位十五合一」→「C」）
    const plan = (r.plan_code || 'unknown').split(/\s/)[0]
    if (!planCounts[plan]) planCounts[plan] = { count: 0, revenue: 0 }
    planCounts[plan].count++
    planCounts[plan].revenue += parseFloat(r.amount_usd) || 0
  }
  const topProducts = Object.entries(planCounts)
    .map(([plan, data]) => ({ plan, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // 熱門頁面
  const pageCounts: Record<string, number> = {}
  for (const p of (topPagesRes.data || [])) {
    pageCounts[p.page_path] = (pageCounts[p.page_path] || 0) + 1
  }
  const topPages = Object.entries(pageCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 國家分佈
  const countryCounts: Record<string, number> = {}
  for (const c of (countriesRes.data || [])) {
    const country = c.country || 'Unknown'
    countryCounts[country] = (countryCounts[country] || 0) + 1
  }
  const geoDistribution = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count, pct: Math.round(count / Math.max(totalPageviews, 1) * 100) }))
    .sort((a, b) => b.count - a.count)

  // 設備分佈
  const deviceCounts: Record<string, number> = {}
  for (const d of (devicesRes.data || [])) {
    deviceCounts[d.device_type || 'unknown'] = (deviceCounts[d.device_type || 'unknown'] || 0) + 1
  }

  // 免費工具轉化率
  const freeToolCount = freeToolRes.count || 0
  const conversionRate = freeToolCount > 0 ? Math.round(reports.length / freeToolCount * 100) : 0

  // 每日收入匯總
  const dailyMap: Record<string, { revenue: number; orders: number }> = {}
  for (const r of reports) {
    const day = (r.created_at || '').slice(0, 10)
    if (!day) continue
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 }
    dailyMap[day].revenue += parseFloat(r.amount_usd) || 0
    dailyMap[day].orders++
  }
  const dailyRevenue = Object.entries(dailyMap)
    .map(([date, d]) => ({ date, revenue: Math.round(d.revenue * 100) / 100, orders: d.orders }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    range,
    overview: {
      unique_visitors: uniqueSessions,
      total_pageviews: totalPageviews,
      total_orders: reports.length,
      completed_reports: completedReports,
      total_revenue_usd: Math.round(totalRevenue * 100) / 100,
      free_tool_usage: freeToolCount,
      conversion_rate_pct: conversionRate,
    },
    top_products: topProducts,
    top_pages: topPages,
    geo_distribution: geoDistribution,
    device_distribution: deviceCounts,
    daily_revenue: dailyRevenue,
    recent_orders: reports.slice(0, 10).map(r => ({
      id: r.id,
      client_name: r.client_name,
      plan_code: (r.plan_code || '').split(/\s/)[0],
      amount_usd: r.amount_usd,
      status: r.status,
      created_at: r.created_at,
    })),
  })
}
