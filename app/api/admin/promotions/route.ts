import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_KEY

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

function auth(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  return key === ADMIN_KEY
}

// GET — 取得所有促銷活動
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { data, error } = await getSupabase()
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promotions: data || [] })
}

// POST — 建立新促銷活動
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: '無權限' }, { status: 403 })

  const body = await req.json()
  const { name, discount_percent, start_at, end_at, applicable_plans } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: '促銷名稱不能為空' }, { status: 400 })
  }
  if (typeof discount_percent !== 'number' || discount_percent < 1 || discount_percent > 99) {
    return NextResponse.json({ error: '折扣百分比必須在 1-99 之間' }, { status: 400 })
  }
  if (!start_at || !end_at) {
    return NextResponse.json({ error: '必須設定開始與結束時間' }, { status: 400 })
  }
  if (new Date(end_at) <= new Date(start_at)) {
    return NextResponse.json({ error: '結束時間必須晚於開始時間' }, { status: 400 })
  }

  const { data, error } = await getSupabase()
    .from('promotions')
    .insert({
      name: name.trim(),
      discount_percent,
      start_at,
      end_at,
      applicable_plans: applicable_plans?.length ? applicable_plans : null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promotion: data })
}

// PATCH — 更新/切換啟用/停用促銷活動
export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: '無權限' }, { status: 403 })

  const body = await req.json()
  const { id, action, ...updates } = body

  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const supabase = getSupabase()

  // 切換啟用/停用
  if (action === 'toggle') {
    const { data: current } = await supabase
      .from('promotions')
      .select('is_active')
      .eq('id', id)
      .single()
    if (!current) return NextResponse.json({ error: '找不到該促銷活動' }, { status: 404 })

    const { error } = await supabase
      .from('promotions')
      .update({ is_active: !current.is_active })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 刪除
  if (action === 'delete') {
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 更新欄位（name, discount_percent, start_at, end_at, applicable_plans）
  if (action === 'update') {
    const allowed: Record<string, unknown> = {}
    if (updates.name !== undefined) allowed.name = updates.name.trim()
    if (updates.discount_percent !== undefined) allowed.discount_percent = updates.discount_percent
    if (updates.start_at !== undefined) allowed.start_at = updates.start_at
    if (updates.end_at !== undefined) allowed.end_at = updates.end_at
    if (updates.applicable_plans !== undefined) {
      allowed.applicable_plans = updates.applicable_plans?.length ? updates.applicable_plans : null
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 })
    }

    const { error } = await supabase
      .from('promotions')
      .update(allowed)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '未知 action' }, { status: 400 })
}
