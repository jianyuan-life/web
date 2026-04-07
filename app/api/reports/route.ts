import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 從 cookie 建立帶 auth session 的 Supabase client
async function getAuthSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    },
  )
}

// 取得當前登入用戶，未登入回傳 null
async function getAuthUser() {
  const supabase = await getAuthSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Service role client（用於需要繞過 RLS 的操作）
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  // 用 service role + user_id 過濾，確保只取該用戶的報告
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('paid_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reports: data || [] })
}

// PATCH — 重試失敗的報告
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少報告 ID' }, { status: 400 })

  const supabase = getServiceSupabase()

  // 取得報告資料，確認屬於該用戶
  const { data: report, error: fetchErr } = await supabase
    .from('paid_reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
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

  // 更新狀態為 pending
  await supabase.from('paid_reports').update({
    status: 'pending',
    error_message: null,
    retry_count: (report.retry_count ?? 0) + 1,
  }).eq('id', id)

  // 觸發報告生成（fire-and-forget）
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
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少報告 ID' }, { status: 400 })

  const supabase = getServiceSupabase()

  // 確認報告屬於該用戶後才刪除
  const { error } = await supabase
    .from('paid_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
