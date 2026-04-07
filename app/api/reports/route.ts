import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

// GET — 取得用戶的報告（前端傳 email）
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: '缺少 email' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('paid_reports')
    .select('*')
    .ilike('customer_email', email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reports: data || [] })
}

// PATCH — 重試失敗的報告
export async function PATCH(req: NextRequest) {
  const { id, email } = await req.json()
  if (!id || !email) return NextResponse.json({ error: '缺少參數' }, { status: 400 })

  const supabase = getServiceSupabase()

  const { data: report, error: fetchErr } = await supabase
    .from('paid_reports')
    .select('*')
    .eq('id', id)
    .ilike('customer_email', email.toLowerCase())
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: '找不到報告' }, { status: 404 })
  }

  if (report.status !== 'failed') {
    return NextResponse.json({ error: '只能重試失敗的報告' }, { status: 400 })
  }

  if ((report.retry_count ?? 0) >= 3) {
    return NextResponse.json({ error: '已達最大重試次數（3次），請聯繫客服' }, { status: 429 })
  }

  await supabase.from('paid_reports').update({
    status: 'pending',
    error_message: null,
    retry_count: (report.retry_count ?? 0) + 1,
  }).eq('id', id)

  // 觸發報告生成
  const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || 'https://fortune-reports-api.fly.dev'
  fetch(`${PYTHON_API}/api/generate-report-async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_id: report.id,
      access_token: report.access_token,
      plan_code: report.plan_code,
      birth_data: report.birth_data,
      customer_email: report.customer_email,
      additional_people: null,
    }),
  }).catch(err => console.error('重試觸發失敗:', err))

  return NextResponse.json({ success: true, message: '報告已重新排入生成佇列' })
}

export async function DELETE(req: NextRequest) {
  const { id, email } = await req.json()
  if (!id || !email) return NextResponse.json({ error: '缺少參數' }, { status: 400 })

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from('paid_reports')
    .delete()
    .eq('id', id)
    .ilike('customer_email', email.toLowerCase())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
