import { NextRequest, NextResponse } from 'next/server'

const PRICE_MAP: Record<string, { amount: number; name: string }> = {
  C: { amount: 8900, name: '全方位十五合一' },
  A: { amount: 4900, name: '核心三合一' },
  G15: { amount: 26900, name: '家庭全方位十五合一' },
  G3: { amount: 14900, name: '家庭核心三合一' },
  D: { amount: 2900, name: '專項深度分析' },
  M: { amount: 1900, name: '月度運勢分析' },
  Y: { amount: 15900, name: '年度運勢分析' },
  R: { amount: 5900, name: '關於我與他' },
  E1: { amount: 11900, name: '事件出門訣' },
  E2: { amount: 8900, name: '月盤出門訣' },
  E3: { amount: 85900, name: '年盤出門訣' },
  // 加人附加費
  'G15-ADD': { amount: 6900, name: '家庭全方位加1人' },
  'G3-ADD': { amount: 3900, name: '家庭核心加1人' },
  'R-ADD': { amount: 1900, name: '關於我與他加1人' },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planCode, birthData, totalPrice } = body

    const plan = PRICE_MAP[planCode]
    if (!plan) {
      return NextResponse.json({ error: '無效的方案代碼' }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey === 'sk_test_placeholder') {
      return NextResponse.json({ error: 'Stripe 尚未設定' }, { status: 500 })
    }

    const siteUrl = 'https://web-jamie-ho.vercel.app'

    // G15/G3 家庭方案：使用前端動態計算的金額（單位：美元），轉為美分
    // 其他方案：使用固定金額
    const isFamilyPlan = planCode === 'G15' || planCode === 'G3'
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
    // 存入 birthData 供 webhook 使用（Stripe metadata 上限 500 字元/值）
    if (birthData) {
      const birthDataStr = JSON.stringify(birthData)
      params.set('metadata[birth_data]', birthDataStr.slice(0, 500))
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
