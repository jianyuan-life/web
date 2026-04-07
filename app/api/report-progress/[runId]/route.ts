// ============================================================
// 報告生成進度串流端點
// GET /api/report-progress/[runId]
// 客戶端用 EventSource / fetch 接收即時進度
// ============================================================

import { getRun } from 'workflow/api'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params
  const { searchParams } = new URL(request.url)
  const startIndex = searchParams.get('startIndex')

  const run = getRun(runId)
  const stream = run.getReadable(
    startIndex ? { startIndex: parseInt(startIndex, 10) } : undefined,
  )

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
