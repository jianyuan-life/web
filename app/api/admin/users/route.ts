import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_KEY || 'jianyuan2026'

// 延遲初始化 Supabase（避免建置時 env var 不存在報錯）
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const sort = req.nextUrl.searchParams.get('sort') || 'created_at'
  const order = req.nextUrl.searchParams.get('order') || 'desc'

  try {
    // 取得所有用戶（Supabase Admin API，分頁取前 500 位）
    const { data: usersData, error: usersError } = await getSupabase().auth.admin.listUsers({
      page: 1,
      perPage: 500,
    })

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    const users = usersData?.users || []

    // 取得所有付費報告（關聯用戶 email）
    const { data: reports } = await getSupabase()
      .from('paid_reports')
      .select('id, user_id, client_name, plan_code, amount_usd, status, created_at')
      .order('created_at', { ascending: false })

    // 按 user_id 分組報告
    const reportsByUser: Record<string, typeof reports> = {}
    for (const r of (reports || [])) {
      if (!r.user_id) continue
      if (!reportsByUser[r.user_id]) reportsByUser[r.user_id] = []
      reportsByUser[r.user_id]!.push(r)
    }

    // 組合用戶資料
    const userList = users.map(u => {
      const userReports = reportsByUser[u.id] || []
      const totalSpent = userReports.reduce((sum, r) => sum + (parseFloat(r.amount_usd) || 0), 0)
      return {
        id: u.id,
        email: u.email || '',
        full_name: u.user_metadata?.full_name || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        purchase_count: userReports.length,
        total_spent: Math.round(totalSpent * 100) / 100,
        reports: userReports.map(r => ({
          id: r.id,
          plan_code: (r.plan_code || '').split(/\s/)[0],
          client_name: r.client_name,
          amount_usd: r.amount_usd,
          status: r.status,
          created_at: r.created_at,
        })),
      }
    })

    // 排序
    userList.sort((a, b) => {
      if (sort === 'purchase_count') {
        return order === 'desc' ? b.purchase_count - a.purchase_count : a.purchase_count - b.purchase_count
      }
      if (sort === 'total_spent') {
        return order === 'desc' ? b.total_spent - a.total_spent : a.total_spent - b.total_spent
      }
      // 預設按註冊時間
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return order === 'desc' ? db - da : da - db
    })

    return NextResponse.json({
      total: userList.length,
      users: userList,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '查詢失敗' }, { status: 500 })
  }
}
