import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

// 從 cookie 驗證 Supabase Auth 登入狀態
async function getAuthEmail(req: NextRequest): Promise<string | null> {
  try {
    const cookies = req.headers.get('cookie') || ''
    const accessTokenMatch = cookies.match(/sb-[^=]+-auth-token[^=]*=([^;]+)/)
    if (!accessTokenMatch) return null
    const tokenData = JSON.parse(decodeURIComponent(accessTokenMatch[1]))
    const token = Array.isArray(tokenData) ? tokenData[0] : tokenData?.access_token || tokenData
    if (typeof token !== 'string' || token.length < 20) return null
    const supabase = getSupabase()
    const { data } = await supabase.auth.getUser(token)
    return data?.user?.email || null
  } catch {
    return null
  }
}

// 搜尋已完成的人生藍圖（C 方案）報告（需登入）
// GET /api/checkout/search-reports?email=xxx          → 取得該 email 下所有已完成 C 報告
// GET /api/checkout/search-reports?q=keyword           → 用姓名模糊搜尋
export async function GET(req: NextRequest) {
  try {
    // 身份驗證：必須登入才能使用
    const authEmail = await getAuthEmail(req)
    if (!authEmail) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    const query = searchParams.get('q')?.trim()

    if (!email && !query) {
      return NextResponse.json({ error: '請提供 email 或搜尋關鍵字' }, { status: 400 })
    }

    const supabase = getSupabase()

    if (email) {
      // 精確搜尋：取得該 email 下所有已完成的 C 方案報告
      const { data, error } = await supabase
        .from('paid_reports')
        .select('id, client_name, plan_code, status, created_at')
        .eq('customer_email', email)
        .eq('plan_code', 'C')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('search-reports DB error:', error)
        return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
      }

      return NextResponse.json({
        reports: (data || []).map(r => ({
          id: r.id,
          name: r.client_name || '未知',
          createdAt: r.created_at,
        })),
      })
    }

    // 模糊搜尋：用姓名搜尋（ilike）
    if (query && query.length >= 1) {
      const { data, error } = await supabase
        .from('paid_reports')
        .select('id, client_name, customer_email, plan_code, status, created_at')
        .eq('plan_code', 'C')
        .eq('status', 'completed')
        .ilike('client_name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('search-reports DB error:', error)
        return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
      }

      return NextResponse.json({
        reports: (data || []).map(r => ({
          id: r.id,
          name: r.client_name || '未知',
          // 隱私：只顯示 email 前3字元 + ***
          emailHint: r.customer_email
            ? r.customer_email.substring(0, 3) + '***'
            : '',
          createdAt: r.created_at,
        })),
      })
    }

    return NextResponse.json({ reports: [] })
  } catch (err) {
    console.error('search-reports error:', err)
    return NextResponse.json({ error: '搜尋失敗' }, { status: 500 })
  }
}
