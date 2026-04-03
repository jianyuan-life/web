import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ============================================================
// 付費報告生成 API — 排盤 + DeepSeek AI 深度分析 + 自動寄信
// 流程：Python API 排盤 → DeepSeek 深度分析 → 存 Supabase → 寄 Email
// ============================================================

const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || 'https://fortune-reports-api.fly.dev'
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
)

const PLAN_SYSTEM_PROMPT: Record<string, string> = {
  C: `你是鑒源命理系統的首席分析師，精通東西方十五大命理系統。你的任務是根據15套系統的排盤計算結果，為客戶撰寫一份專業、深度、個人化的全方位命格分析報告。

報告必須包含：
1. 命格總覽（一段話概括此人核心命格特質）
2. 人格深度分析（性格、行為模式、思維方式、價值觀）
3. 事業方向（適合行業Top5、職場風格、領導力、創業潛力）
4. 財運分析（正財/偏財、投資風格、財務風險、理財建議）
5. 感情分析（戀愛模式、婚姻特質、桃花運、對象特徵）
6. 健康提醒（五行臟腑、易患疾病、養生建議、運動推薦）
7. 人際關係（貴人類型、社交模式、需遠離的人）
8. 人生機遇（大運走勢、未來3-5年關鍵轉折）
9. 行業分析（最適合的5個具體行業方向+原因）
10. 好的地方（5項天賦優勢，每項2-3句）
11. 需要注意的地方（5項風險挑戰，每項2-3句）
12. 改善方案（5項具體可執行建議，含幸運色/方位/數字/飾品）

語言要求：繁體中文，語氣專業溫暖，像一位德高望重的大師在面對面指導。
字數要求：4000-6000字。
核心原則：所有分析必須基於排盤數據，不可憑空編造。`,

  A: `你是鑒源命理系統的分析師，精通八字命理、紫微斗數、奇門遁甲三大核心系統。請根據三大系統的排盤結果，為客戶撰寫專業的命格分析報告。

報告結構同全方位方案，但基於3個核心系統做交叉驗證。
字數要求：2500-4000字。`,

  D: `你是鑒源命理系統的專項分析師。客戶有一個具體問題需要深入分析。請根據所有相關系統的排盤結果和客戶描述的問題，給出深度的專項分析。

報告必須包含：
1. 問題分析（根據命盤解讀此問題的根本原因）
2. 當前狀態（命盤中顯示的現況）
3. 好的地方（3項有利因素）
4. 需要注意的地方（3項風險）
5. 改善方案（5項具體可執行的建議）
6. 時間建議（什麼時候行動最有利）

字數要求：1500-2500字。`,

  M: `你是鑒源命理系統的月運分析師。請根據排盤數據為客戶分析當月運勢。

報告必須包含：
1. 本月總體運勢
2. 事業運、財運、感情運、健康運各一段
3. 重要日期提醒
4. 好的地方（3項）
5. 需要注意的地方（3項）
6. 改善方案（3項具體建議）
農曆月份必須標註對應的國曆日期範圍。
字數要求：1500-2000字。`,

  Y: `你是鑒源命理系統的年運分析師。請根據排盤數據為客戶做全年12個月的逐月運勢分析。

報告必須包含：
1. 年度總體運勢概覽
2. 逐月分析（12個月，每月含：運勢概述+好的+注意+改善）
3. 年度重要月份和日期
4. 年度好的地方（5項）
5. 年度需注意的地方（5項）
6. 年度改善方案（5項）
農曆月份必須標註對應的國曆日期範圍。
字數要求：5000-8000字。`,

  R: `你是鑒源命理系統的關係分析師。請根據多人的排盤數據，分析他們之間的關係。

報告必須包含：
1. 每個人的核心命格簡述
2. 合盤分析（相合/相沖/互補之處）
3. 互動建議（如何更好地相處）
4. 好的地方（關係中的優勢）
5. 需要注意的地方（潛在衝突點）
6. 改善方案（具體互動建議）
字數要求：2500-4000字。`,
}

export async function POST(req: NextRequest) {
  try {
    const { reportId, accessToken, customerEmail, planCode, birthData, additionalPeople, topic, question } = await req.json()

    // Step 1: 呼叫 Python API 排盤
    console.log(`開始生成報告: ${reportId}, 方案${planCode}`)

    let calcResult = null
    try {
      const res = await fetch(`${PYTHON_API}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: birthData.name,
          year: birthData.year, month: birthData.month, day: birthData.day,
          hour: birthData.hour, minute: birthData.minute || 0,
          gender: birthData.gender,
        }),
      })
      if (res.ok) calcResult = await res.json()
    } catch (e) { console.error('排盤失敗:', e) }

    if (!calcResult) {
      return NextResponse.json({ error: '排盤計算失敗' }, { status: 500 })
    }

    // Step 2: 構建 DeepSeek prompt
    const systemPrompt = PLAN_SYSTEM_PROMPT[planCode] || PLAN_SYSTEM_PROMPT['C']
    const cd = calcResult.client_data
    const analyses = calcResult.analyses || []

    // 精簡 prompt（避免 Vercel 60秒超時）
    let userPrompt = `${birthData.name}，${birthData.gender==='M'?'男':'女'}，${birthData.year}年${birthData.month}月${birthData.day}日${birthData.hour}時
八字：${cd.bazi || ''} | 用神：${cd.yongshen || ''} | 五行：${JSON.stringify(cd.five_elements || {})}
${analyses.length}系統排盤摘要：
`
    for (const a of analyses.slice(0, 15)) {
      userPrompt += `${a.system}(${a.score}分)`
      if (a.good_points?.length) userPrompt += ` 好:${a.good_points[0]?.slice(0,30)}`
      if (a.bad_points?.length) userPrompt += ` 注意:${a.bad_points[0]?.slice(0,30)}`
      userPrompt += '\n'
    }

    // 住址風水資料
    if (birthData.address) {
      userPrompt += `\n住址：${birthData.address}`
      if (birthData.address_lat && birthData.address_lng) {
        userPrompt += `（精確坐標：北緯 ${birthData.address_lat.toFixed(4)}°，東經 ${birthData.address_lng.toFixed(4)}°）`
      }
      userPrompt += `\n請在風水分析部分，根據住址坐向和五行環境給出具體建議。\n`
    }

    // 專項/關係方案附加問題
    if (topic) userPrompt += `\n分析方向：${topic}\n`
    if (question) userPrompt += `客戶問題描述：${question}\n`

    // 多人方案
    if (additionalPeople?.length) {
      userPrompt += `\n其他人資料：\n`
      for (const p of additionalPeople) {
        userPrompt += `- ${p.name}，${p.gender === 'M' ? '男' : '女'}，${p.year}年${p.month}月${p.day}日${p.hour === 'unknown' || p.time_unknown ? '（時辰不確定）' : ` ${p.hour}時`}\n`
      }
    }

    userPrompt += `\n請根據以上所有數據，撰寫完整的分析報告。注意：現在是2026年丙午年。`

    // Step 3: 呼叫 DeepSeek
    console.log('呼叫 DeepSeek 生成報告...')
    let reportContent = ''
    try {
      const res = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      })
      const data = await res.json()
      reportContent = data.choices?.[0]?.message?.content || ''
      console.log(`DeepSeek 回覆: ${reportContent.length} 字`)
    } catch (e) {
      console.error('DeepSeek 失敗:', e)
      return NextResponse.json({ error: 'AI 生成失敗' }, { status: 500 })
    }

    if (!reportContent) {
      return NextResponse.json({ error: 'AI 未回覆' }, { status: 500 })
    }

    // Step 4: 存入 Supabase
    const { error: dbError } = await supabase.from('paid_reports').update({
      report_result: {
        report_id: reportId,
        systems_count: analyses.length,
        analyses_summary: analyses.map((a: { system: string; score: number }) => ({ system: a.system, score: a.score })),
        ai_content: reportContent,
        ai_model: 'deepseek-chat',
        ai_tokens: reportContent.length,
      },
      status: 'completed',
    }).eq('id', reportId)

    if (dbError) console.error('Supabase 更新失敗:', dbError)

    // Step 5: 寄送報告 Email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
    const reportUrl = `${siteUrl}/report/${accessToken}`
    const planNames: Record<string, string> = {
      C: '全方位十五合一命格分析', A: '核心三合一分析', D: '專項深度分析',
      G15: '家庭全方位分析', G3: '家庭核心三合一', R: '關於我與他',
      M: '月度運勢分析', Y: '年度運勢分析',
      E1: '事件出門訣', E2: '月盤出門訣', E3: '年盤出門訣',
    }
    const planName = planNames[planCode] || '命理分析報告'

    if (customerEmail && accessToken) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY || '')
        const previewContent = reportContent.slice(0, 300).replace(/[#*`]/g, '').trim()

        await resend.emails.send({
          from: '鑑源命理 <reports@jianyuan.life>',
          to: customerEmail,
          subject: `【鑑源命理】您的${planName}報告已完成 — ${birthData?.name || ''}`,
          html: `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'PingFang TC','Microsoft JhengHei',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- 頂部品牌 -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="color:#c9a84c;font-size:24px;font-weight:700;letter-spacing:4px;">鑑 源</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px;">JIANYUAN · 東西方命理整合平台</div>
    </div>

    <!-- 主卡片 -->
    <div style="background:linear-gradient(135deg,#1a2a4a,#0d1a2e);border:1px solid #2a3a5a;border-radius:16px;padding:32px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;letter-spacing:2px;margin-bottom:8px;">✦ 報告完成通知</div>
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">${birthData?.name || ''}，您的報告已完成</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px 0;">${planName} · ${analyses.length} 套命理系統分析</p>

      <!-- 報告預覽 -->
      <div style="background:rgba(255,255,255,0.05);border-left:3px solid #c9a84c;border-radius:4px;padding:16px;margin-bottom:24px;">
        <p style="color:#d1d5db;font-size:14px;line-height:1.8;margin:0;">${previewContent}...</p>
      </div>

      <!-- CTA 按鈕 -->
      <div style="text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c87a);color:#0d1117;font-weight:700;font-size:16px;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
          查看完整報告 →
        </a>
        <p style="color:#6b7280;font-size:12px;margin:12px 0 0 0;">此連結專屬於您，無需登入即可查看</p>
      </div>
    </div>

    <!-- 出門訣推廣（非 E 方案才顯示）-->
    ${!['E1','E2','E3'].includes(planCode) ? `
    <div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;font-weight:600;margin-bottom:8px;">🧭 加強您的命理能量</div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 16px 0;">
        報告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出門訣</strong>能讓您在最佳時機、最佳方位行動，
        將命理能量轉化為現實中的改變。許多客戶在使用出門訣後，事業和財運都有顯著提升。
      </p>
      <a href="https://jianyuan.life/pricing" style="color:#c9a84c;font-size:13px;text-decoration:none;">了解出門訣方案 →</a>
    </div>
    ` : ''}

    <!-- 頁尾 -->
    <div style="text-align:center;color:#4b5563;font-size:12px;line-height:1.8;">
      <p>如有任何問題，請聯繫 <a href="mailto:support@jianyuan.life" style="color:#c9a84c;">support@jianyuan.life</a></p>
      <p style="margin-top:8px;">© 2026 鑑源命理平台 · jianyuan.life</p>
    </div>
  </div>
</body>
</html>`,
        })

        // 更新 email_sent_at
        await supabase.from('paid_reports')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('id', reportId)

        console.log(`✅ Email 已寄送至 ${customerEmail}`)
      } catch (emailErr) {
        console.error('Email 寄送失敗:', emailErr)
        // 不讓 email 失敗影響整體回傳
      }
    }

    return NextResponse.json({
      success: true,
      report_id: reportId,
      report_url: reportUrl,
      content_length: reportContent.length,
      systems_count: analyses.length,
    })
  } catch (err) {
    console.error('報告生成錯誤:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : '生成失敗' }, { status: 500 })
  }
}
