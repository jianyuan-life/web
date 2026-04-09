import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

// 從 Authorization header 或 cookie 驗證 Supabase Auth 登入狀態
async function getAuthEmail(req: NextRequest): Promise<string | null> {
  try {
    let token: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
    if (!token) {
      const cookies = req.headers.get('cookie') || ''
      const match = cookies.match(/sb-[^=]+-auth-token[^=]*=([^;]+)/)
      if (match) {
        const tokenData = JSON.parse(decodeURIComponent(match[1]))
        token = Array.isArray(tokenData) ? tokenData[0] : tokenData?.access_token || tokenData
      }
    }
    if (!token || typeof token !== 'string' || token.length < 20) return null
    const supabase = getServiceSupabase()
    const { data } = await supabase.auth.getUser(token)
    return data?.user?.email || null
  } catch {
    return null
  }
}

// GET — 取得用戶的報告（需登入驗證，只能查自己的報告）
export async function GET(req: NextRequest) {
  const authEmail = await getAuthEmail(req)
  if (!authEmail) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('paid_reports')
    .select('*')
    .ilike('customer_email', authEmail.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reports: data || [] })
}

// PATCH — 重試失敗的報告（需登入驗證）
export async function PATCH(req: NextRequest) {
  const authEmail = await getAuthEmail(req)
  if (!authEmail) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少參數' }, { status: 400 })
  const email = authEmail

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

  // 觸發 Workflow 報告生成（不用舊版 Fly.io 端點）
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
  fetch(`${siteUrl}/api/workflows/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId: report.id }),
  }).catch(err => console.error('重試 Workflow 觸發失敗:', err))

  return NextResponse.json({ success: true, message: '報告已重新排入生成佇列' })
}

// DELETE — 刪除報告（需登入驗證）
export async function DELETE(req: NextRequest) {
  const authEmail = await getAuthEmail(req)
  if (!authEmail) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少參數' }, { status: 400 })

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from('paid_reports')
    .delete()
    .eq('id', id)
    .ilike('customer_email', authEmail.toLowerCase())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
