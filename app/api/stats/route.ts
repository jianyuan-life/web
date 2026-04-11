import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 只顯示真實數據，不加虛假基數
const BASE_COUNT = 0

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET() {
  try {
    const supabase = getServiceSupabase()

    // 免費用戶去重人數
    const { count: freeCount, error: freeErr } = await supabase
      .from('user_analytics')
      .select('*', { count: 'exact', head: true })

    // 付費報告總數（每筆 completed 都算 1 次）
    const { count: paidCount, error: paidErr } = await supabase
      .from('paid_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    if (freeErr && paidErr) {
      return NextResponse.json({ count: BASE_COUNT })
    }

    const total = (freeCount ?? 0) + (paidCount ?? 0) + BASE_COUNT
    return NextResponse.json({ count: total })
  } catch {
    return NextResponse.json({ count: BASE_COUNT })
  }
}
