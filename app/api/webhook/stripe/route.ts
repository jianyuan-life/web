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
    const draftId = session.metadata?.draft_id
    const birthDataStr = session.metadata?.birth_data // 向後兼容舊格式
    const sessionLocale = session.metadata?.locale || 'zh-TW'
    const amount = (session.amount_total || 0) / 100
    const customerEmail = (session.customer_details?.email || session.customer_email || '').toLowerCase()

    console.log(`✅ 付款成功！方案${planCode}, $${amount}`)

    // 存入 Supabase（用公開 reports 表，不需要 user_id 的簡化版）
    const supabase = getSupabase()

    let birthData = null
    const reportResult = null

    if (draftId) {
      // 從 Supabase checkout_drafts 取回完整 birthData（無 500 字元限制）
      const { data: draft, error: draftErr } = await supabase
        .from('checkout_drafts')
        .select('birth_data, plan_code, locale')
        .eq('id', draftId)
        .single()

      if (draftErr) {
        console.error('checkout_drafts 讀取失敗:', draftErr)
      } else if (draft) {
        birthData = draft.birth_data
        // 標記已使用，避免重複取用
        await supabase
          .from('checkout_drafts')
          .update({ used_at: new Date().toISOString() })
          .eq('id', draftId)
      }
    } else if (birthDataStr) {
      // 向後兼容：舊的 Stripe metadata 直接存 JSON 字串格式
      try { birthData = JSON.parse(birthDataStr) } catch { /* ignore */ }
    }

    // 先存入 Supabase（狀態 pending）
    let reportId = ''
    let accessToken = ''
    try {
      const { data: insertData, error: insertErr } = await supabase.from('paid_reports').insert({
        client_name: birthData?.plan_type === 'family_email' || birthData?.plan_type === 'family_reports'
          ? (birthData?.member_names?.filter(Boolean).join('、') || 'Unknown')
          : birthData?.plan === 'R'
          ? (birthData?.members?.map((m: { name?: string }) => m.name).filter(Boolean).join(' × ') || 'Unknown')
          : birthData?.plan_type === 'family'
          ? (birthData?.members?.map((m: { name?: string }) => m.name).filter(Boolean).join('、') || 'Unknown')
          : (birthData?.name || 'Unknown'),
        plan_code: planCode,
        amount_usd: amount,
        stripe_session_id: session.id,
        birth_data: birthData,
        customer_email: customerEmail,
        status: 'pending',
      }).select('id, access_token').single()

      if (insertErr) console.error('Supabase insert error:', insertErr)
      else {
        reportId = insertData?.id || ''
        accessToken = insertData?.access_token || ''
      }
      console.log('✅ 報告記錄已建立:', reportId)
    } catch (err) { console.error('Supabase error:', err) }

    // 呼叫 Fly.io 異步報告生成 Pipeline（無超時限制，完整排盤數據）
    if (birthData && reportId) {
      try {
        console.log('觸發 Workflow 報告生成...')
        const additionalData = birthData.additionalPeople ? JSON.parse(birthData.additionalPeople) : undefined

        // 注入 locale（報告語言：zh-TW 繁體 / zh-CN 簡體）
        if (!birthData.locale) {
          birthData.locale = sessionLocale
        }
        // 確保 customer_note 傳入 birth_data
        if (session.metadata?.customer_note && !birthData.customer_note) {
          birthData.customer_note = session.metadata.customer_note
        }
        // D 方案的 topic/question
        if (session.metadata?.topic && !birthData.topic) {
          birthData.topic = session.metadata.topic
        }
        if (session.metadata?.question && !birthData.question) {
          birthData.question = session.metadata.question
        }

        // 記錄優惠碼使用
        const couponCodeUsed = session.metadata?.coupon_code
        if (couponCodeUsed) {
          try {
            const { data: couponRow } = await supabase.from('coupons').select('id, used_count').eq('code', couponCodeUsed).single()
            if (couponRow) {
              await supabase.from('coupons').update({ used_count: (couponRow.used_count || 0) + 1 }).eq('id', couponRow.id)
              await supabase.from('coupon_uses').insert({
                coupon_id: couponRow.id,
                coupon_code: couponCodeUsed,
                order_id: session.id,
                customer_email: customerEmail,
                plan_code: planCode,
                original_amount: (session.amount_subtotal || session.amount_total || 0) / 100,
                discount_applied: ((session.amount_subtotal || 0) - (session.amount_total || 0)) / 100,
              })
            }
          } catch (couponErr) {
            console.error('優惠碼記錄失敗:', couponErr)
          }
        }

        // 觸發 Vercel Workflow 生成報告（持久化、自動重試、不受超時限制）
        // 更新 birth_data 到 Supabase（workflow 從 DB 讀取）
        await supabase.from('paid_reports').update({
          birth_data: birthData,
        }).eq('id', reportId)

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
        fetch(`${siteUrl}/api/workflows/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId }),
        }).catch(err => console.error('Workflow 觸發失敗:', err))
        // 不 await，讓 webhook 秒級返回
      } catch (err) {
        console.error('報告觸發失敗:', err)
      }
    }

  }

  return NextResponse.json({ received: true })
}
