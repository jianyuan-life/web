import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

const PRICE_MAP: Record<string, { amount: number; name: string }> = {
  C: { amount: 8900, name: '人生藍圖' },
  D: { amount: 3900, name: '心之所惑' },
  G15: { amount: 15900, name: '家族藍圖' },
  R: { amount: 5900, name: '合否？' },
  E1: { amount: 11900, name: '事件出門訣' },
  E2: { amount: 8900, name: '月盤出門訣' },
  // 加人附加費
  'G15-ADD': { amount: 6900, name: '家族藍圖加1人' },
  'R-ADD': { amount: 1900, name: '合否？加1人' },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planCode, birthData, totalPrice, locale, couponCode, couponDiscount } = body

    const plan = PRICE_MAP[planCode]
    if (!plan) {
      return NextResponse.json({ error: '無效的方案代碼' }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey === 'sk_test_placeholder') {
      return NextResponse.json({ error: 'Stripe 尚未設定' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'

    // G15 家族藍圖：使用前端動態計算的金額（單位：美元），轉為美分
    // 其他方案：使用固定金額
    const isFamilyPlan = planCode === 'G15'
    let baseAmount = isFamilyPlan && typeof totalPrice === 'number'
      ? Math.round(totalPrice * 100)
      : plan.amount

    // 套用優惠碼折扣（伺服器端二次驗證）
    let finalAmount = baseAmount
    let verifiedCouponCode = ''
    if (couponCode) {
      const supabase = getSupabase()
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (coupon) {
        const now = new Date()
        const notExpired = !coupon.valid_until || new Date(coupon.valid_until) > now
        const notExhausted = coupon.max_uses === null || coupon.used_count < coupon.max_uses
        const planAllowed = !coupon.applicable_products || coupon.applicable_products.includes(planCode)

        if (notExpired && notExhausted && planAllowed) {
          verifiedCouponCode = coupon.code
          const baseUsd = baseAmount / 100
          if (coupon.discount_type === 'percentage') {
            finalAmount = Math.round(baseAmount * (1 - coupon.discount_value / 100))
          } else if (coupon.discount_type === 'fixed') {
            finalAmount = Math.max(0, baseAmount - Math.round(coupon.discount_value * 100))
          } else if (coupon.discount_type === 'free') {
            finalAmount = 0
          }
        }
      }
    }

    // 免費方案：跳過 Stripe，直接建立訂單
    if (finalAmount === 0 && verifiedCouponCode) {
      const supabase = getSupabase()
      const draftRes = await supabase.from('checkout_drafts').insert({
        plan_code: planCode, birth_data: birthData, locale: locale || 'zh-TW',
      }).select('id').single()

      if (!draftRes.data) return NextResponse.json({ error: '暫存資料失敗' }, { status: 500 })

      // 直接插入訂單並觸發報告生成
      const fakeSessionId = `free_${Date.now()}`
      await supabase.from('orders').insert({
        stripe_session_id: fakeSessionId,
        plan_code: planCode,
        amount_usd: 0,
        status: 'pending',
        customer_email: birthData?.email || '',
        birth_data: birthData,
        coupon_code: verifiedCouponCode,
      })

      // 建立 paid_reports 記錄（跟 webhook 一樣的流程）
      const accessToken = crypto.randomUUID()
      const { data: reportData } = await supabase.from('paid_reports').insert({
        client_name: birthData?.name || '',
        plan_code: planCode,
        amount_usd: 0,
        stripe_session_id: fakeSessionId,
        birth_data: birthData,
        status: 'pending',
        access_token: accessToken,
        customer_email: (birthData?.email || '').toLowerCase(),
      }).select('id').single()

      const reportId = reportData?.id || ''

      // 記錄優惠碼使用
      const { data: couponRow } = await supabase.from('coupons').select('id, used_count').eq('code', verifiedCouponCode).single()
      if (couponRow) {
        await supabase.from('coupons').update({ used_count: (couponRow.used_count || 0) + 1 }).eq('id', couponRow.id)
        await supabase.from('coupon_uses').insert({
          coupon_id: couponRow.id, coupon_code: verifiedCouponCode,
          order_id: fakeSessionId, customer_email: birthData?.email || '',
          plan_code: planCode, original_amount: baseAmount / 100, discount_applied: baseAmount / 100,
        })
      }

      // 觸發 Workflow 生成報告
      if (reportId) {
        fetch(`${siteUrl}/api/workflows/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId }),
        }).catch(err => console.error('免費方案 Workflow 觸發失敗:', err))
      }

      return NextResponse.json({ url: `${siteUrl}/dashboard?payment=success&free=1` })
    }

    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${siteUrl}/dashboard?payment=success`)
    params.set('cancel_url', `${siteUrl}/pricing`)
    params.set('line_items[0][price_data][currency]', 'usd')
    params.set('line_items[0][price_data][product_data][name]', `Fortune Report - Plan ${planCode}`)
    params.set('line_items[0][price_data][unit_amount]', finalAmount.toString())
    params.set('line_items[0][quantity]', '1')
    params.set('metadata[plan_code]', planCode)
    if (verifiedCouponCode) params.set('metadata[coupon_code]', verifiedCouponCode)
    // locale 單獨存，不佔 birth_data 500 字元額度
    if (locale) {
      params.set('metadata[locale]', locale)
    }
    // 將完整 birthData 存入 Supabase checkout_drafts，避免 Stripe metadata 500 字元限制
    if (birthData) {
      const supabase = getSupabase()
      const { data: draft, error: draftErr } = await supabase
        .from('checkout_drafts')
        .insert({
          plan_code: planCode,
          birth_data: birthData,
          locale: locale || 'zh-TW',
        })
        .select('id')
        .single()

      if (draftErr || !draft) {
        console.error('checkout_drafts insert 失敗:', draftErr)
        return NextResponse.json({ error: '暫存資料失敗' }, { status: 500 })
      }

      // Stripe metadata 只存 draft_id（36 字元 UUID，遠低於 500 字元限制）
      params.set('metadata[draft_id]', draft.id)
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()

    if (!res.ok || !data.url) {
      console.error('Stripe error:', JSON.stringify(data))
      const errMsg = data.error?.message || '建立付款失敗'
      const errParam = data.error?.param || ''
      return NextResponse.json(
        { error: `${errMsg}${errParam ? ` (param: ${errParam})` : ''}`, debug: { status: res.status, stripe_error: data.error } },
        { status: 500 },
      )
    }

    return NextResponse.json({ url: data.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '系統錯誤' },
      { status: 500 },
    )
  }
}
