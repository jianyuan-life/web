import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

const PRICE_MAP: Record<string, { amount: number; name: string }> = {
  C: { amount: 8900, name: '人生藍圖' },
  D: { amount: 3900, name: '心之所惑' },
  G15: { amount: 26900, name: '家族藍圖' },
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
    const { planCode, birthData, totalPrice, locale } = body

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
    const finalAmount = isFamilyPlan && typeof totalPrice === 'number'
      ? Math.round(totalPrice * 100)
      : plan.amount

    const params = new URLSearchParams()
    params.set('mode', 'payment')
    params.set('success_url', `${siteUrl}/dashboard?payment=success`)
    params.set('cancel_url', `${siteUrl}/pricing`)
    params.set('line_items[0][price_data][currency]', 'usd')
    params.set('line_items[0][price_data][product_data][name]', `Fortune Report - Plan ${planCode}`)
    params.set('line_items[0][price_data][unit_amount]', finalAmount.toString())
    params.set('line_items[0][quantity]', '1')
    params.set('metadata[plan_code]', planCode)
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
