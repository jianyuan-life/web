// ============================================================
// 報告生成 Workflow — Step Functions（完整 Node.js 存取）
// 每個 step 自動重試、結果持久化
// ============================================================

import { getWritable } from 'workflow'
import { FatalError, RetryableError } from 'workflow'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  getAgeGroup,
  buildCall1Prompt, buildCall2Prompt, buildCall3Prompt, buildCall4Prompt,
  buildUserPrompt, SYSTEM_GROUPS,
} from '@/prompts/c_plan_v2'

// ── 常數 ──
const PYTHON_API = process.env.NEXT_PUBLIC_API_URL || 'https://fortune-reports-api.fly.dev'
const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''

// ── 型別 ──
export interface BirthData {
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  gender: string
  locale?: string
  cityLat?: number
  cityLng?: number
  address?: string
  customer_note?: string
  topic?: string
  question?: string
  [key: string]: unknown
}

export interface ProgressUpdate {
  step: string
  progress: number  // 0-100
  message: string
}

interface AnalysisItem {
  system: string
  score: number
  summary?: string
  good_points?: string[]
  bad_points?: string[]
  warnings?: string[]
  improvements?: string[]
  tables?: Array<{ title: string; headers?: string[]; rows?: string[][] }>
  details?: string | Record<string, unknown>
  info_boxes?: Array<{ title?: string; items?: string[] }>
}

interface CalcResult {
  client_data: {
    bazi?: string
    yongshen?: string
    five_elements?: Record<string, number>
    lunar_date?: string
    nayin?: string
    ming_gong?: string
    [key: string]: unknown
  }
  analyses: AnalysisItem[]
}

// ── Supabase 客戶端 ──
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  )
}

// ── 進度串流輔助 ──
async function emitProgress(update: ProgressUpdate) {
  "use step";
  const writable = getWritable<ProgressUpdate>()
  const writer = writable.getWriter()
  try {
    await writer.write(update)
  } finally {
    writer.releaseLock()
  }
}

// ── AI 回應清理 ──
function cleanAIResponse(text: string): string {
  let cleaned = text
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n---\s*\n?/i, '')
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n(?=#{1,4}\s)/i, '')
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n\n/i, '')
  cleaned = cleaned.replace(/^(好的|收到|我將|我會|讓我|以下是|沒問題|當然)[^\n]*\n+/i, '')
  cleaned = cleaned.replace(/鑑源/g, '鑒源')
  return cleaned.trim()
}

// ── locale prompt 轉換 ──
function localizePrompt(prompt: string, locale?: string): string {
  if (locale === 'zh-CN') {
    return prompt.replace(/語言：繁體中文。/g, '語言：簡體中文。')
  }
  return prompt
}

// ── Step 0: 載入報告記錄 ──
export async function loadReportRecord(reportId: string) {
  "use step";
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('paid_reports')
    .select('retry_count, status, birth_data, plan_code, access_token, customer_email')
    .eq('id', reportId)
    .single()

  if (error || !data) {
    throw new FatalError(`找不到報告記錄: ${reportId}`)
  }

  if (!data.birth_data) {
    throw new FatalError(`報告 ${reportId} 缺少出生資料`)
  }

  // 更新狀態為 processing
  await supabase.from('paid_reports').update({
    status: 'pending',
    error_message: null,
  }).eq('id', reportId)

  return {
    birthData: data.birth_data as BirthData,
    planCode: data.plan_code as string,
    accessToken: data.access_token as string,
    customerEmail: data.customer_email as string,
    retryCount: data.retry_count ?? 0,
  }
}

// ── Step 1: 呼叫 Python API 排盤 ──
export async function callPythonCalculate(birthData: BirthData) {
  "use step";
  await emitProgress({ step: '排盤運算', progress: 10, message: '正在計算十五大命理系統排盤...' })

  const res = await fetch(`${PYTHON_API}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: birthData.name,
      year: birthData.year, month: birthData.month, day: birthData.day,
      hour: birthData.hour, minute: birthData.minute || 0,
      gender: birthData.gender,
      ...(birthData.cityLat && birthData.cityLng ? { lat: birthData.cityLat, lng: birthData.cityLng } : {}),
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    // Python API 可能暫時不可用，允許重試
    throw new RetryableError(`排盤 API 回傳 ${res.status}: ${errText}`, { retryAfter: '10s' })
  }

  const result: CalcResult = await res.json()
  console.log(`排盤完成: ${result.analyses?.length || 0} 套系統`)
  return result
}
callPythonCalculate.maxRetries = 3

// ── Claude 串流呼叫（內部輔助，非 step） ──
async function claudeStreamingCall(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 429) {
      throw new RetryableError(`Claude API 429 限流`, { retryAfter: '30s' })
    }
    throw new Error(`Claude API ${res.status}: ${errText.slice(0, 300)}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Claude API 無回應串流')

  const decoder = new TextDecoder()
  let result = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const event = JSON.parse(data)
        if (event.type === 'content_block_delta' && event.delta?.text) {
          result += event.delta.text
        }
      } catch { /* 忽略 */ }
    }
  }
  return result
}

// ── DeepSeek 呼叫（內部輔助，非 step） ──
async function deepseekCall(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(DEEPSEEK_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 429) {
      throw new RetryableError(`DeepSeek API 429 限流`, { retryAfter: '15s' })
    }
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── 構建非 C 方案的通用 user prompt ──
function buildGenericUserPrompt(
  birthData: BirthData,
  cd: CalcResult['client_data'],
  analyses: AnalysisItem[],
  topic?: string,
  question?: string,
  additionalPeople?: Array<{ name: string; gender: string; year: number; month: number; day: number; hour: string | number; time_unknown?: boolean }>,
): string {
  let userPrompt = `${birthData.name}，${birthData.gender === 'M' ? '男' : '女'}，${birthData.year}年${birthData.month}月${birthData.day}日${birthData.hour}時
八字：${cd.bazi || ''} | 用神：${cd.yongshen || ''} | 五行：${JSON.stringify(cd.five_elements || {})}
農曆：${cd.lunar_date || ''} | 納音：${cd.nayin || ''} | 命宮：${cd.ming_gong || ''}
${analyses.length}套系統排盤完整數據：
`
  for (const a of analyses.slice(0, 15)) {
    userPrompt += `\n【${a.system}】評分：${a.score}分`
    if (a.summary) userPrompt += `\n摘要：${a.summary}`
    if (a.good_points?.length) {
      userPrompt += `\n好的地方：`
      for (const g of a.good_points) userPrompt += `\n- ${g}`
    }
    if (a.bad_points?.length) {
      userPrompt += `\n需要注意：`
      for (const b of a.bad_points) userPrompt += `\n- ${b}`
    }
    if (a.warnings?.length) {
      userPrompt += `\n注意事項：`
      for (const w of a.warnings) userPrompt += `\n- ${w}`
    }
    if (a.improvements?.length) {
      userPrompt += `\n改善建議：`
      for (const imp of a.improvements) userPrompt += `\n- ${imp}`
    }
    if (a.tables?.length) {
      for (const t of a.tables) {
        userPrompt += `\n表格「${t.title}」：\n`
        if (t.headers) userPrompt += `| ${t.headers.join(' | ')} |\n`
        if (t.rows) {
          for (const row of t.rows) userPrompt += `| ${row.join(' | ')} |\n`
        }
      }
    }
    if (a.details) {
      const detail = typeof a.details === 'string' ? a.details : JSON.stringify(a.details)
      userPrompt += `\n詳細排盤：\n${detail}\n`
    }
    if (a.info_boxes?.length) {
      for (const box of a.info_boxes) {
        userPrompt += `\n${box.title || '補充'}：\n`
        if (box.items) {
          for (const item of box.items) userPrompt += `- ${item}\n`
        }
      }
    }
    userPrompt += '\n'
  }

  if (topic) userPrompt += `\n分析方向：${topic}\n`
  if (question) userPrompt += `客戶問題描述：${question}\n`
  if (additionalPeople?.length) {
    userPrompt += `\n其他人資料：\n`
    for (const p of additionalPeople) {
      userPrompt += `- ${p.name}，${p.gender === 'M' ? '男' : '女'}，${p.year}年${p.month}月${p.day}日${p.hour === 'unknown' || p.time_unknown ? '（時辰不確定）' : ` ${p.hour}時`}\n`
    }
  }

  userPrompt += `\n請根據以上所有排盤數據，撰寫完整的分析報告。
重要提醒：
1. 現在是2026年丙午年。
2. 你的每一個分析論點都必須引用上方排盤數據中的具體結果，不得編造。
3. 排盤數據中「好的地方」和「需要注意」的每一條都必須在報告中被展開分析，不可遺漏。
4. 如果某個系統數據不完整，跳過該系統，不要瞎編。`

  return userPrompt
}

// ── Step 2a: C 方案 AI 生成 — Call 1（命格總覽 + 東方三大） ──
export async function aiGenerateCall1(
  calcResult: CalcResult, birthData: BirthData, question?: string,
) {
  "use step";
  const ageGroup = getAgeGroup(birthData.year)
  const clientNeed = question || undefined
  const userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, SYSTEM_GROUPS.call1, birthData)

  // 先嘗試 Claude，失敗 fallback DeepSeek
  let content = ''
  let model = 'unknown'
  if (CLAUDE_API_KEY) {
    try {
      content = await claudeStreamingCall(buildCall1Prompt(ageGroup, clientNeed, birthData.locale), userPrompt, 16384)
      model = 'claude-opus-4-6'
    } catch (e) {
      console.error('Call 1 Claude 失敗，fallback DeepSeek:', e)
    }
  }
  if (!content) {
    content = await deepseekCall(buildCall1Prompt(ageGroup, clientNeed, birthData.locale), userPrompt, 16384)
    model = 'deepseek-chat'
  }

  const cleaned = cleanAIResponse(content)
  console.log(`Call 1 完成 (${model}): ${cleaned.length} 字`)
  return { content: cleaned, model }
}
aiGenerateCall1.maxRetries = 2

// ── Step 2b: C 方案 AI 生成 — Call 2（西方 + 整合系統） ──
export async function aiGenerateCall2(
  calcResult: CalcResult, birthData: BirthData,
) {
  "use step";
  const ageGroup = getAgeGroup(birthData.year)
  const userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, SYSTEM_GROUPS.call2, birthData)

  let content = ''
  let model = 'unknown'
  if (CLAUDE_API_KEY) {
    try {
      content = await claudeStreamingCall(buildCall2Prompt(ageGroup, birthData.locale), userPrompt, 12288)
      model = 'claude-opus-4-6'
    } catch (e) {
      console.error('Call 2 Claude 失敗，fallback DeepSeek:', e)
    }
  }
  if (!content) {
    content = await deepseekCall(buildCall2Prompt(ageGroup, birthData.locale), userPrompt, 12288)
    model = 'deepseek-chat'
  }

  const cleaned = cleanAIResponse(content)
  console.log(`Call 2 完成 (${model}): ${cleaned.length} 字`)
  return { content: cleaned, model }
}
aiGenerateCall2.maxRetries = 2

// ── Step 2c: C 方案 AI 生成 — Call 3（環境 + 輔助系統） ──
export async function aiGenerateCall3(
  calcResult: CalcResult, birthData: BirthData,
) {
  "use step";
  const ageGroup = getAgeGroup(birthData.year)
  const userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, SYSTEM_GROUPS.call3, birthData)

  let content = ''
  let model = 'unknown'
  if (CLAUDE_API_KEY) {
    try {
      content = await claudeStreamingCall(buildCall3Prompt(ageGroup, birthData.locale), userPrompt, 8192)
      model = 'claude-opus-4-6'
    } catch (e) {
      console.error('Call 3 Claude 失敗，fallback DeepSeek:', e)
    }
  }
  if (!content) {
    content = await deepseekCall(buildCall3Prompt(ageGroup, birthData.locale), userPrompt, 8192)
    model = 'deepseek-chat'
  }

  const cleaned = cleanAIResponse(content)
  console.log(`Call 3 完成 (${model}): ${cleaned.length} 字`)
  return { content: cleaned, model }
}
aiGenerateCall3.maxRetries = 2

// ── Step 2d: C 方案 AI 生成 — Call 4（交叉驗證 + 刻意練習 + 寫給你的話） ──
export async function aiGenerateCall4(
  calcResult: CalcResult, birthData: BirthData, isRetry?: boolean, missingParts?: string[],
) {
  "use step";
  const ageGroup = getAgeGroup(birthData.year)
  const allSystems = [...SYSTEM_GROUPS.call1, ...SYSTEM_GROUPS.call2, ...SYSTEM_GROUPS.call3]
  let userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, allSystems, birthData)

  if (isRetry && missingParts?.length) {
    userPrompt += `\n\n【重要提醒——你上次漏掉了以下章節，這次必須全部補上】\n${missingParts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n不要寫任何前言，直接從章節標題開始。`
  }

  let content = ''
  let model = 'unknown'
  const maxTokens = isRetry ? 32768 : 16384

  if (CLAUDE_API_KEY) {
    try {
      content = await claudeStreamingCall(buildCall4Prompt(ageGroup, birthData.name, birthData.locale), userPrompt, maxTokens)
      model = 'claude-opus-4-6'
    } catch (e) {
      console.error('Call 4 Claude 失敗，fallback DeepSeek:', e)
    }
  }
  if (!content) {
    content = await deepseekCall(buildCall4Prompt(ageGroup, birthData.name, birthData.locale), userPrompt, maxTokens)
    model = 'deepseek-chat'
  }

  const cleaned = cleanAIResponse(content)
  console.log(`Call 4 完成 (${model}): ${cleaned.length} 字`)
  return { content: cleaned, model }
}
aiGenerateCall4.maxRetries = 2

// ── Step 2e: 非 C 方案 AI 生成（單次呼叫） ──
export async function aiGenerateGeneric(
  calcResult: CalcResult, birthData: BirthData, planCode: string,
  systemPrompt: string, topic?: string, question?: string,
) {
  "use step";
  const userPrompt = buildGenericUserPrompt(birthData, calcResult.client_data, calcResult.analyses, topic, question)
  const localizedPrompt = localizePrompt(systemPrompt, birthData.locale)

  let content = ''
  let model = 'unknown'

  if (CLAUDE_API_KEY) {
    try {
      content = await claudeStreamingCall(localizedPrompt, userPrompt, 32768)
      model = 'claude-opus-4-6'
    } catch (e) {
      console.error(`方案 ${planCode} Claude 失敗，fallback DeepSeek:`, e)
    }
  }
  if (!content) {
    content = await deepseekCall(localizedPrompt, userPrompt, 8000)
    model = 'deepseek-chat'
  }

  const cleaned = cleanAIResponse(content)
  console.log(`方案 ${planCode} AI 完成 (${model}): ${cleaned.length} 字`)
  return { content: cleaned, model }
}
aiGenerateGeneric.maxRetries = 2

// ── Step 3: 生成 PDF ──
export async function generatePDF(
  reportId: string, planCode: string, birthData: BirthData,
  reportContent: string, analyses: Array<{ system: string; score: number }>,
) {
  "use step";
  if (['E1', 'E2'].includes(planCode)) {
    console.log('出門訣方案不生成 PDF')
    return null
  }

  await emitProgress({ step: '生成PDF', progress: 80, message: '正在生成精美報告 PDF...' })

  const planNames: Record<string, string> = {
    C: '人生藍圖', D: '心之所惑', G15: '家族藍圖',
    R: '合否？', E1: '事件出門訣', E2: '月盤出門訣', Y: '年度運勢',
  }
  const planName = planNames[planCode] || '命理分析報告'

  const pdfRes = await fetch(`${PYTHON_API}/api/generate-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_id: reportId,
      plan_code: planCode,
      client_name: birthData.name,
      plan_name: planName,
      ai_content: reportContent,
      locale: birthData.locale || 'zh-TW',
      analyses_summary: analyses,
    }),
  })

  if (!pdfRes.ok) {
    console.error('PDF 生成失敗:', await pdfRes.text())
    return null // PDF 失敗不阻塞整體流程
  }

  const pdfData = await pdfRes.json()
  if (!pdfData.pdf_base64) return null

  // 上傳到 Supabase Storage
  const supabase = getSupabase()
  const pdfBytes = Buffer.from(pdfData.pdf_base64, 'base64')
  const storagePath = `${reportId}/report.pdf`

  const { error: uploadErr } = await supabase.storage
    .from('reports')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

  if (uploadErr) {
    console.error('Supabase Storage 上傳失敗:', uploadErr)
    return null
  }

  const { data: urlData } = supabase.storage.from('reports').getPublicUrl(storagePath)
  console.log(`✅ PDF 上傳完成: ${urlData.publicUrl} (${pdfData.file_size_kb}KB)`)
  return urlData.publicUrl
}
generatePDF.maxRetries = 2

// ── Step 4: 更新 Supabase 報告狀態為 completed ──
export async function saveReportToSupabase(
  reportId: string, reportContent: string, aiModel: string,
  analyses: Array<{ system: string; score: number }>, pdfUrl: string | null,
  top5Timings?: unknown,
) {
  "use step";
  await emitProgress({ step: '儲存報告', progress: 90, message: '正在儲存報告...' })

  const reportResult: Record<string, unknown> = {
    report_id: reportId,
    systems_count: analyses.length,
    analyses_summary: analyses,
    ai_content: reportContent,
    ai_model: aiModel,
    ai_tokens: reportContent.length,
  }
  if (top5Timings) reportResult.top5_timings = top5Timings

  const supabase = getSupabase()
  const { error } = await supabase.from('paid_reports').update({
    report_result: reportResult,
    pdf_url: pdfUrl,
    status: 'completed',
  }).eq('id', reportId)

  if (error) {
    throw new RetryableError(`Supabase 更新失敗: ${error.message}`)
  }

  console.log(`✅ 報告 ${reportId} 已標記完成`)
  return true
}

// ── Step 5: 寄送 Email ──
export async function sendReportEmail(
  reportId: string, customerEmail: string, accessToken: string,
  birthData: BirthData, planCode: string, reportContent: string,
  analysesCount: number,
) {
  "use step";
  if (!customerEmail || !accessToken) {
    console.log('缺少 email 或 access_token，跳過寄信')
    return false
  }

  await emitProgress({ step: '寄送通知', progress: 95, message: '正在寄送報告通知郵件...' })

  const planNames: Record<string, string> = {
    C: '人生藍圖', D: '心之所惑', G15: '家族藍圖',
    R: '合否？', E1: '事件出門訣', E2: '月盤出門訣', Y: '年度運勢',
  }
  const planName = planNames[planCode] || '命理分析報告'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jianyuan.life'
  const reportUrl = `${siteUrl}/report/${accessToken}`
  const isCN = birthData.locale === 'zh-CN'
  const emailFont = isCN
    ? "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif"
    : "'PingFang TC','Microsoft JhengHei','Noto Sans TC',sans-serif"
  const emailLang = isCN ? 'zh-CN' : 'zh-TW'

  const emailText = {
    brand: isCN ? '鉴 源' : '鑑 源',
    subtitle: isCN ? 'JIANYUAN · 东西方命理整合平台' : 'JIANYUAN · 東西方命理整合平台',
    notice: isCN ? '✦ 报告完成通知' : '✦ 報告完成通知',
    title: isCN ? `${birthData.name}，您的报告已完成` : `${birthData.name}，您的報告已完成`,
    systemCount: isCN ? `${planName} · ${analysesCount} 套命理系统分析` : `${planName} · ${analysesCount} 套命理系統分析`,
    cta: isCN ? '查看完整报告 →' : '查看完整報告 →',
    linkNote: isCN ? '此链接专属于您，无需登录即可查看' : '此連結專屬於您，無需登入即可查看',
    promoTitle: isCN ? '🧭 加强您的命理能量' : '🧭 加強您的命理能量',
    promoBody: isCN
      ? '报告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出门诀</strong>能让您在最佳时机、最佳方位行动，将命理能量转化为现实中的改变。许多客户在使用出门诀后，事业和财运都有显著提升。'
      : '報告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出門訣</strong>能讓您在最佳時機、最佳方位行動，將命理能量轉化為現實中的改變。許多客戶在使用出門訣後，事業和財運都有顯著提升。',
    promoLink: isCN ? '了解出门诀方案 →' : '了解出門訣方案 →',
    footer: isCN ? '如有任何问题，请联系' : '如有任何問題，請聯繫',
    copyright: isCN ? '© 2026 鉴源命理平台 · jianyuan.life' : '© 2026 鑒源命理平台 · jianyuan.life',
    subject: isCN
      ? `【鉴源命理】您的${planName}报告已完成 — ${birthData.name}`
      : `【鑒源命理】您的${planName}報告已完成 — ${birthData.name}`,
    from: isCN ? '鉴源命理 <reports@jianyuan.life>' : '鑒源命理 <reports@jianyuan.life>',
  }

  const previewContent = reportContent.slice(0, 300).replace(/[#*`]/g, '').trim()
  const resend = new Resend(process.env.RESEND_API_KEY || '')

  await resend.emails.send({
    from: emailText.from,
    to: customerEmail,
    subject: emailText.subject,
    html: `<!DOCTYPE html>
<html lang="${emailLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:${emailFont};">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="color:#c9a84c;font-size:24px;font-weight:700;letter-spacing:4px;">${emailText.brand}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px;">${emailText.subtitle}</div>
    </div>
    <div style="background:linear-gradient(135deg,#1a2a4a,#0d1a2e);border:1px solid #2a3a5a;border-radius:16px;padding:32px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;letter-spacing:2px;margin-bottom:8px;">${emailText.notice}</div>
      <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px 0;">${emailText.title}</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px 0;">${emailText.systemCount}</p>
      <div style="background:rgba(255,255,255,0.05);border-left:3px solid #c9a84c;border-radius:4px;padding:16px;margin-bottom:24px;">
        <p style="color:#d1d5db;font-size:14px;line-height:1.8;margin:0;">${previewContent}...</p>
      </div>
      <div style="text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c87a);color:#0d1117;font-weight:700;font-size:16px;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:1px;">${emailText.cta}</a>
        <p style="color:#6b7280;font-size:12px;margin:12px 0 0 0;">${emailText.linkNote}</p>
      </div>
    </div>
    ${!['E1', 'E2', 'E3'].includes(planCode) ? `
    <div style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="color:#c9a84c;font-size:13px;font-weight:600;margin-bottom:8px;">${emailText.promoTitle}</div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 16px 0;">${emailText.promoBody}</p>
      <a href="https://jianyuan.life/pricing" style="color:#c9a84c;font-size:13px;text-decoration:none;">${emailText.promoLink}</a>
    </div>` : ''}
    <div style="text-align:center;color:#4b5563;font-size:12px;line-height:1.8;">
      <p>${emailText.footer} <a href="mailto:support@jianyuan.life" style="color:#c9a84c;">support@jianyuan.life</a></p>
      <p style="margin-top:8px;">${emailText.copyright}</p>
    </div>
  </div>
</body>
</html>`,
  })

  // 更新 email_sent_at
  const supabase = getSupabase()
  await supabase.from('paid_reports')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', reportId)

  console.log(`✅ Email 已寄送至 ${customerEmail}`)
  return true
}
sendReportEmail.maxRetries = 2

// ── Step 6: 標記失敗 ──
export async function markReportFailed(reportId: string, errorMessage: string) {
  "use step";
  const supabase = getSupabase()
  await supabase.from('paid_reports').update({
    status: 'failed',
    error_message: errorMessage,
  }).eq('id', reportId)
  console.error(`報告 ${reportId} 標記為失敗: ${errorMessage}`)
}

// ── Step: 關閉進度串流 ──
export async function closeProgressStream() {
  "use step";
  const writable = getWritable<ProgressUpdate>()
  await writable.close()
}

// ── 匯出輔助常數（供 workflow 使用） ──
export { PLAN_SYSTEM_PROMPT } from './plan-prompts'
