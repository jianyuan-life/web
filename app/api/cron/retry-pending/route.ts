// ============================================================
// Cron 重試端點 — 自動偵測卡住的 pending 報告並重新觸發生成
// 每 5 分鐘由 Vercel Cron 呼叫一次
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel Cron 最長執行時間 60 秒
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // 驗證 cron secret（防止外部未授權呼叫）
  // TODO: 需在 Vercel Dashboard 設定 CRON_SECRET 環境變數
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  // 查詢超過 5 分鐘仍為 pending 的報告
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: stuckReports, error: queryErr } = await supabase
    .from('paid_reports')
    .select('id, retry_count, created_at')
    .eq('status', 'pending')
    .lt('created_at', fiveMinAgo)
    .order('created_at', { ascending: true })
    .limit(10)

  if (queryErr) {
    console.error('❌ 查詢卡住報告失敗:', queryErr)
    return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
  }

  if (!stuckReports?.length) {
    return NextResponse.json({ message: '無卡住的報告', retriedCount: 0 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
  let retriedCount = 0

  for (const report of stuckReports) {
    const currentRetry = report.retry_count || 0

    if (currentRetry >= 3) {
      // 超過 3 次重試，標記為 failed
      await supabase.from('paid_reports').update({
        status: 'failed',
        error_message: `重試 ${currentRetry} 次仍失敗，請人工介入`,
      }).eq('id', report.id)
      console.log(`⚠️ 報告 ${report.id} 超過重試上限，標記為 failed`)
      continue
    }

    // 更新 retry_count
    await supabase.from('paid_reports').update({
      retry_count: currentRetry + 1,
    }).eq('id', report.id)

    // 重新觸發 workflow
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      await fetch(`${siteUrl}/api/workflows/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      retriedCount++
      console.log(`✅ 重試報告 ${report.id}（第${currentRetry + 1}次）`)
    } catch (err) {
      console.error(`❌ 重試報告 ${report.id} 失敗:`, err)
    }
  }

  return NextResponse.json({
    message: '重試完成',
    retriedCount,
    totalStuck: stuckReports.length,
  })
}
