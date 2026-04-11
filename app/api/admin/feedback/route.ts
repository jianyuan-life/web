import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminKey() {
  return process.env.ADMIN_KEY || ''
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

// GET — 取得所有客戶反饋（需 ADMIN_KEY）
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  const adminKey = getAdminKey()
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('report_feedback')
    .select(`
      id,
      rating,
      most_valuable,
      suggestion,
      would_recommend,
      created_at,
      updated_at,
      report_id,
      paid_reports!inner(client_name, plan_code, customer_email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feedback: data || [] })
}
