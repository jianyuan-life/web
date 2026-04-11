import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 報告瀏覽 / PDF 下載追蹤 API
// event_type: 'view' | 'pdf_download'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { report_id, plan_code, event_type } = body as {
      report_id?: string
      plan_code?: string
      event_type?: string
    }

    if (!report_id || !event_type) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    if (!['view', 'pdf_download'].includes(event_type)) {
      return NextResponse.json({ error: '無效的事件類型' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    )

    const now = new Date().toISOString()

    if (event_type === 'view') {
      // 瀏覽次數 +1，更新最後瀏覽時間
      // 先取得目前 view_count
      const { data: current } = await supabase
        .from('paid_reports')
        .select('view_count')
        .eq('id', report_id)
        .single()

      const currentCount = current?.view_count ?? 0

      await supabase
        .from('paid_reports')
        .update({
          view_count: currentCount + 1,
          last_viewed_at: now,
        })
        .eq('id', report_id)
    } else if (event_type === 'pdf_download') {
      // PDF 下載次數 +1，更新最後下載時間
      const { data: current } = await supabase
        .from('paid_reports')
        .select('pdf_download_count')
        .eq('id', report_id)
        .single()

      const currentCount = current?.pdf_download_count ?? 0

      await supabase
        .from('paid_reports')
        .update({
          pdf_download_count: currentCount + 1,
          last_downloaded_at: now,
        })
        .eq('id', report_id)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
