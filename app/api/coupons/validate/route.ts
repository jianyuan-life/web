import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = (searchParams.get('code') || '').trim().toUpperCase()
  const planCode = searchParams.get('plan') || ''
  const amount = parseFloat(searchParams.get('amount') || '0')

  if (!code) return NextResponse.json({ valid: false, message: '請輸入優惠碼' })

  const supabase = getSupabase()
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !coupon) return NextResponse.json({ valid: false, message: '優惠碼不存在' })
  if (!coupon.is_active) return NextResponse.json({ valid: false, message: '優惠碼已停用' })
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: '優惠碼已過期' })
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, message: '優惠碼已達使用上限' })
  }
  if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && planCode) {
    if (!coupon.applicable_plans.includes(planCode)) {
      return NextResponse.json({ valid: false, message: `此優惠碼不適用於此方案` })
    }
  }

  let discountAmount = 0
  let finalAmount = amount

  if (coupon.discount_type === 'percentage') {
    discountAmount = Math.round(amount * coupon.discount_value / 100 * 100) / 100
    finalAmount = Math.max(0, amount - discountAmount)
  } else if (coupon.discount_type === 'fixed') {
    discountAmount = Math.min(coupon.discount_value, amount)
    finalAmount = Math.max(0, amount - discountAmount)
  } else if (coupon.discount_type === 'free') {
    discountAmount = amount
    finalAmount = 0
  }

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    discountAmount,
    finalAmount,
    message: coupon.discount_type === 'free'
      ? '免費體驗優惠碼已套用！'
      : coupon.discount_type === 'percentage'
        ? `折扣 ${coupon.discount_value}% 已套用`
        : `折抵 $${coupon.discount_value} 已套用`,
  })
}
