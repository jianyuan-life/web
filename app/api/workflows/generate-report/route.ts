// ============================================================
// Workflow 觸發端點：啟動報告生成 workflow
// POST /api/workflows/generate-report
// ============================================================

import { start } from 'workflow/api'
import { NextRequest, NextResponse } from 'next/server'
import { generateReportWorkflow } from '@/workflows/generate-report'

export async function POST(req: NextRequest) {
  try {
    // 安全驗證：只允許內部呼叫（Webhook/Cron/Fallback）
    // 檢查來源是否為同網站或帶有正確的 CRON_SECRET
    const origin = req.headers.get('origin') || ''
    const referer = req.headers.get('referer') || ''
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
    const authHeader = req.headers.get('authorization')
    const isInternalCall = origin.startsWith(siteUrl) || referer.startsWith(siteUrl) || origin === '' // 伺服器端 fetch 無 origin
    const hasCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`

    // 外部直接呼叫且無授權 → 拒絕
    if (!isInternalCall && !hasCronSecret) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { reportId } = await req.json()

    if (!reportId) {
      return NextResponse.json({ error: '缺少 reportId' }, { status: 400 })
    }

    console.log(`啟動報告生成 workflow: ${reportId}`)

    const run = await start(generateReportWorkflow, [reportId])

    return NextResponse.json({
      success: true,
      runId: run.runId,
      reportId,
    })
  } catch (err) {
    console.error('Workflow 啟動失敗:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    )
  }
}
