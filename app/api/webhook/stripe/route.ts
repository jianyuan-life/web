import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  // @ts-expect-error - Stripe SDK version mismatch
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-12-18.acacia' })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  )
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig || '', process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const planCode = session.metadata?.plan_code || 'C'
    const birthDataStr = session.metadata?.birth_data
    const amount = (session.amount_total || 0) / 100
    const customerEmail = session.customer_details?.email || session.customer_email || ''

    console.log(`✅ 付款成功！方案${planCode}, $${amount}`)

    // 存入 Supabase（用公開 reports 表，不需要 user_id 的簡化版）
    const supabase = getSupabase()

    let birthData = null
    let reportResult = null

    if (birthDataStr) {
      try { birthData = JSON.parse(birthDataStr) } catch { /* ignore */ }
    }

    // 先存入 Supabase（狀態 pending）
    let reportId = ''
    try {
      const { data: insertData, error: insertErr } = await supabase.from('paid_reports').insert({
        client_name: birthData?.name || 'Unknown',
        plan_code: planCode,
        amount_usd: amount,
        stripe_session_id: session.id,
        birth_data: birthData,
        customer_email: customerEmail,
        status: 'pending',
      }).select('id, access_token').single()

      if (insertErr) console.error('Supabase insert error:', insertErr)
      else reportId = insertData?.id || ''
      console.log('✅ 報告記錄已建立:', reportId)
    } catch (err) { console.error('Supabase error:', err) }

    // 呼叫 AI 報告生成 API（DeepSeek + Python排盤）
    if (birthData && reportId) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
      try {
        console.log('呼叫 AI 報告生成...')
        const additionalData = birthData.additionalPeople ? JSON.parse(birthData.additionalPeople) : undefined
        fetch(`${siteUrl}/api/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            accessToken: insertData?.access_token || '',
            customerEmail,
            planCode,
            birthData,
            additionalPeople: additionalData,
            topic: session.metadata?.topic || '',
            question: session.metadata?.question || '',
          }),
        }).catch(err => console.error('AI 報告觸發失敗:', err))
        // 不 await，讓 webhook 先返回
      } catch (err) {
        console.error('❌ 報告觸發失敗:', err)
      }
    }

  }

  return NextResponse.json({ received: true })
}
