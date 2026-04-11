import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

// 遮蔽姓名：王大明 → 王*明，李四 → 李*
function maskName(name: string): string {
  if (!name || name.length === 0) return '***'
  if (name.length === 1) return name + '*'
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ valid: false, message: '請提供推薦碼' }, { status: 400 })
    }

    // 格式驗證：JY-XXXXX
    if (!/^JY-[A-HJ-NP-Z2-9]{5}$/.test(code)) {
      return NextResponse.json({ valid: false, message: '推薦碼格式無效' })
    }

    const supabase = getSupabase()

    // 查詢推薦碼
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('user_id, is_active')
      .eq('code', code)
      .single()

    if (!referralCode) {
      return NextResponse.json({ valid: false, message: '推薦碼不存在' })
    }

    if (!referralCode.is_active) {
      return NextResponse.json({ valid: false, message: '此推薦碼已停用' })
    }

    // 取推薦人名字（從 auth.users）
    const { data: userData } = await supabase.auth.admin.getUserById(referralCode.user_id)
    const rawName = userData?.user?.user_metadata?.full_name
      || userData?.user?.user_metadata?.name
      || userData?.user?.email?.split('@')[0]
      || ''

    return NextResponse.json({
      valid: true,
      referrerName: maskName(rawName),
    })
  } catch {
    return NextResponse.json({ valid: false, message: '驗證失敗，請稍後再試' }, { status: 500 })
  }
}
