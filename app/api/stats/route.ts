import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 基數：老闆指定的起始值
const BASE_COUNT = 1012

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET() {
  try {
    const supabase = getServiceSupabase()
    const { count, error } = await supabase
      .from('paid_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    if (error) {
      return NextResponse.json({ count: BASE_COUNT })
    }

    return NextResponse.json({ count: (count ?? 0) + BASE_COUNT })
  } catch {
    return NextResponse.json({ count: BASE_COUNT })
  }
}
