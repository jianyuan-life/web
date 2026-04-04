import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

function checkAuth(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || req.headers.get('x-admin-key') || ''
  return key === (process.env.ADMIN_KEY || '').trim()
}

// 列出所有優惠碼
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授權' }, { status: 401 })
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('coupons')
    .select('*, coupon_uses(count)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ coupons: data })
}

// 建立優惠碼
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授權' }, { status: 401 })
  const body = await req.json()
  const { code, discount_type, discount_value, applicable_plans, max_uses, expires_at, note } = body

  if (!code || !discount_type) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value: discount_value || 0,
      applicable_plans: applicable_plans?.length > 0 ? applicable_plans : null,
      max_uses: max_uses || null,
      expires_at: expires_at || null,
      note: note || '',
    })
    .select()
    .single()

  if (error) {
    const msg = error.code === '23505' ? '優惠碼已存在' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ coupon: data })
}

// 更新優惠碼（啟用/停用/刪除）
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: '未授權' }, { status: 401 })
  const body = await req.json()
  const { id, action, ...updates } = body

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const supabase = getSupabase()

  if (action === 'delete') {
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'toggle') {
    const { data: cur } = await supabase.from('coupons').select('is_active').eq('id', id).single()
    const { error } = await supabase.from('coupons').update({ is_active: !cur?.is_active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, is_active: !cur?.is_active })
  }

  // 一般更新
  const { error } = await supabase.from('coupons').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
