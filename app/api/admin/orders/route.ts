import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_KEY

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

// GET — 取得所有訂單（完整資料）
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const { data, error } = await getSupabase()
    .from('paid_reports')
    .select('id, client_name, customer_email, plan_code, amount_usd, status, created_at, updated_at, error_message, retry_count, access_token, birth_data')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    orders: (data || []).map(r => ({
      ...r,
      plan_code: (r.plan_code || '').split(/\s/)[0],
    })),
  })
}
