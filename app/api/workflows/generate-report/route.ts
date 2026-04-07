// ============================================================
// Workflow 觸發端點：啟動報告生成 workflow
// POST /api/workflows/generate-report
// ============================================================

import { start } from 'workflow/api'
import { NextRequest, NextResponse } from 'next/server'
import { generateReportWorkflow } from '@/workflows/generate-report'

export async function POST(req: NextRequest) {
  try {
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
