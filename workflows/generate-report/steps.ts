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

// ── AI 回應清理（單次 call 級別）──
function cleanAIResponse(text: string): string {
  console.log(`[cleanAIResponse] 開始清理，原始長度: ${text.length} 字`)
  let cleaned = text

  // 1. AI 前言
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n---\s*\n?/i, '')
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n(?=#{1,4}\s)/i, '')
  cleaned = cleaned.replace(/^(好的[，,]?\s*|收到[。.]?\s*|我將|我會|讓我|以下是|沒問題|當然|好[，,]|OK[，,]?)[\s\S]*?\n\n/i, '')
  cleaned = cleaned.replace(/^(好的|收到|我將|我會|讓我|以下是|沒問題|當然)[^\n]*\n+/i, '')

  // 2. prompt 結構標籤（任何位置出現都刪整行）
  cleaned = cleaned.replace(/^.*(?:第一幕|第二幕|第三幕|壓軸|收尾|完整分析請繼續閱讀).*$/gm, '')

  // 3. AI 批次標記
  cleaned = cleaned.replace(/（第[一二三四]批）/g, '')

  // 4. 改名建議段落刪除（包含關鍵詞的整段）
  cleaned = cleaned.replace(/^.*(?:建議改名|改名建議|建議名字改為).*$(\n(?!#).*$)*/gm, '')

  // 5. 禁止字眼整行刪除
  cleaned = cleaned.replace(/^.*(?:跳過|本次數據不足|待分析|本次不適用|需面部照片|需掌紋照片|需即時起卦|需即時抽牌|手相掌紋).*$/gm, '')

  // 6. Markdown 垃圾
  cleaned = cleaned.replace(/^---+$/gm, '')
  cleaned = cleaned.replace(/^\|[-:]+\|[-:| ]*$/gm, '')
  cleaned = cleaned.replace(/-{6,}/g, ' — ')
  cleaned = cleaned.replace(/\.{6,}/g, '…')
  cleaned = cleaned.replace(/·{6,}/g, '…')

  // 7. 重點突出：> 結論：開頭的行加粗
  cleaned = cleaned.replace(/^(>\s*結論[：:]\s*)(.+)$/gm, '$1**$2**')
  // 🎯 開頭的行加粗
  cleaned = cleaned.replace(/^(🎯\s*)(.+)$/gm, '$1**$2**')
  // 「關鍵發現」開頭段落裡的結論句加粗
  cleaned = cleaned.replace(/^(關鍵發現[：:]\s*)(.+)$/gm, '$1**$2**')

  // 8. 品牌名
  cleaned = cleaned.replace(/鑑源/g, '鑒源')

  // 9. 連續空行
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  console.log(`[cleanAIResponse] 清理完成，清理後長度: ${cleaned.trim().length} 字`)
  return cleaned.trim()
}

// ── 合併後最終清理（處理跨 call 的問題）──
export function cleanFinalReport(text: string, clientName?: string): string {
  let cleaned = text
  console.log('[cleanFinalReport] 開始最終清理...')

  // 1. 刪除重複報告標題（保留第一個）
  // 策略 A：如果有客戶名字，匹配含客戶名的 h1/h2 標題
  if (clientName) {
    const escapedName = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const namePattern = new RegExp(`^#{1,2}\\s*.*${escapedName}.*報告.*$`, 'gm')
    let count = 0
    cleaned = cleaned.replace(namePattern, (match) => {
      count++
      return count === 1 ? match : ''
    })
    if (count > 1) console.log(`[cleanFinalReport] 刪除 ${count - 1} 個含客戶名的重複標題`)
  }
  // 策略 B：刪除所有重複的 # 報告標題（匹配 # ...報告 格式）
  {
    const h1Pattern = /^# .+報告.*$/gm
    let h1Count = 0
    cleaned = cleaned.replace(h1Pattern, (match) => {
      h1Count++
      return h1Count === 1 ? match : ''
    })
    if (h1Count > 1) console.log(`[cleanFinalReport] 刪除 ${h1Count - 1} 個重複 H1 報告標題`)
  }
  // 策略 C：刪除重複的客戶資料區塊（**客戶：** ... **報告撰寫日：**）
  {
    const infoPattern = /^\*\*客戶[：:]?\*\*.*$(\n^\*\*.+\*\*.*$)*/gm
    let infoCount = 0
    cleaned = cleaned.replace(infoPattern, (match) => {
      infoCount++
      return infoCount === 1 ? match : ''
    })
    if (infoCount > 1) console.log(`[cleanFinalReport] 刪除 ${infoCount - 1} 個重複客戶資料區塊`)
  }

  // 2. 合併重複章節（如「刻意練習」出現兩次，保留內容較長的）
  const sections = cleaned.split(/(?=^## )/m)
  const sectionMap = new Map<string, { index: number; content: string; length: number }>()
  const duplicateIndices = new Set<number>()

  sections.forEach((sec, idx) => {
    const titleMatch = sec.match(/^## (.+?)[\n\r]/)
    if (!titleMatch) return
    const title = titleMatch[1].replace(/[\s\d.、一二三四五六七八九十]+/g, '').trim()
    if (!title) return

    const existing = sectionMap.get(title)
    if (existing) {
      // 保留內容較長的
      if (sec.length > existing.length) {
        duplicateIndices.add(existing.index)
        sectionMap.set(title, { index: idx, content: sec, length: sec.length })
      } else {
        duplicateIndices.add(idx)
      }
      console.log(`[cleanFinalReport] 合併重複章節: "${title}"`)
    } else {
      sectionMap.set(title, { index: idx, content: sec, length: sec.length })
    }
  })

  if (duplicateIndices.size > 0) {
    cleaned = sections.filter((_, idx) => !duplicateIndices.has(idx)).join('')
  }

  // 3. 刪除空章節（## 標題後到下一個 ## 之間不到 50 字）
  cleaned = cleaned.replace(/^## .+\n([\s\S]*?)(?=^## |\Z)/gm, (match, body) => {
    const bodyText = body.replace(/\s/g, '')
    if (bodyText.length < 50) {
      console.log(`[cleanFinalReport] 刪除空章節: ${match.split('\n')[0]}`)
      return ''
    }
    return match
  })

  // 4. 連續空行收攏
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  console.log(`[cleanFinalReport] 最終清理完成，${cleaned.length} 字`)
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
    if (res.status >= 500) {
      // Claude 伺服器錯誤，可重試
      throw new RetryableError(`Claude API ${res.status}: ${errText.slice(0, 300)}`, { retryAfter: '15s' })
    }
    // 4xx 非 429（如 400/401/403）為不可重試錯誤
    throw new FatalError(`Claude API ${res.status}: ${errText.slice(0, 300)}`)
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

// ── Claude → DeepSeek 自動 fallback 輔助函式 ──
async function callAIWithFallback(
  systemPrompt: string, userPrompt: string, maxTokens: number, label: string,
): Promise<{ content: string; model: string }> {
  // 優先用 Claude Opus
  if (CLAUDE_API_KEY) {
    try {
      const content = await claudeStreamingCall(systemPrompt, userPrompt, maxTokens)
      console.log(`${label} 完成 (claude-opus-4-6): ${content.length} 字`)
      return { content, model: 'claude-opus-4-6' }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.warn(`${label} Claude 失敗，自動切換 DeepSeek: ${errMsg.slice(0, 200)}`)
      // 如果是額度不足、認證失敗等，自動 fallback DeepSeek
    }
  }
  // Fallback: DeepSeek
  if (!DEEPSEEK_KEY) {
    throw new FatalError(`${label}: Claude 和 DeepSeek API Key 都不可用`)
  }
  const content = await deepseekCall(systemPrompt, userPrompt, Math.min(maxTokens, 8000))
  console.log(`${label} 完成 (deepseek-chat fallback): ${content.length} 字`)
  return { content, model: 'deepseek-chat' }
}

// ── Step 2a: C 方案 AI 生成 — Call A（系統1-4：東方三大） ──
// C 方案優先用 Claude Opus，Claude 不可用時自動 fallback DeepSeek
export async function aiGenerateCall1(
  calcResult: CalcResult, birthData: BirthData, question?: string,
) {
  "use step";
  await emitProgress({ step: 'AI分析', progress: 20, message: '正在分析東方命理系統（八字/紫微/奇門/風水）...' })

  const ageGroup = getAgeGroup(birthData.year)
  const clientNeed = question || undefined
  const userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, SYSTEM_GROUPS.call1, birthData)
  const systemPrompt = buildCall1Prompt(ageGroup, clientNeed, birthData.locale)

  const result = await callAIWithFallback(systemPrompt, userPrompt, 16384, 'Call A')
  result.content = cleanAIResponse(result.content)
  return result
}
aiGenerateCall1.maxRetries = 3

// ── Step 2b: C 方案 AI 生成 — Call B（系統5-9：西方 + 整合系統） ──
export async function aiGenerateCall2(
  calcResult: CalcResult, birthData: BirthData,
) {
  "use step";
  await emitProgress({ step: 'AI分析', progress: 35, message: '正在分析西方命理系統（占星/吠陀/姓名學/易經/人類圖）...' })

  const ageGroup = getAgeGroup(birthData.year)
  const userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, SYSTEM_GROUPS.call2, birthData)
  const systemPrompt = buildCall2Prompt(ageGroup, birthData.locale)

  const result = await callAIWithFallback(systemPrompt, userPrompt, 12288, 'Call B')
  result.content = cleanAIResponse(result.content)
  return result
}
aiGenerateCall2.maxRetries = 3

// ── Step 2c: C 方案 AI 生成 — Call C（系統10-15：環境 + 輔助系統） ──
export async function aiGenerateCall3(
  calcResult: CalcResult, birthData: BirthData,
) {
  "use step";
  await emitProgress({ step: 'AI分析', progress: 50, message: '正在分析輔助命理系統（塔羅/數字能量/古典占星/生肖/生物節律）...' })

  const ageGroup = getAgeGroup(birthData.year)
  const userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, SYSTEM_GROUPS.call3, birthData)
  const systemPrompt = buildCall3Prompt(ageGroup, birthData.locale)

  const result = await callAIWithFallback(systemPrompt, userPrompt, 8192, 'Call C')
  result.content = cleanAIResponse(result.content)
  return result
}
aiGenerateCall3.maxRetries = 3

// ── Step 2d: C 方案 AI 生成 — Call D（交叉驗證 + 刻意練習 + 寫給你的話） ──
export async function aiGenerateCall4(
  calcResult: CalcResult, birthData: BirthData, isRetry?: boolean, missingParts?: string[],
) {
  "use step";
  await emitProgress({ step: 'AI分析', progress: 60, message: '正在生成交叉驗證、刻意練習與寫給你的話...' })

  const ageGroup = getAgeGroup(birthData.year)
  const allSystems = [...SYSTEM_GROUPS.call1, ...SYSTEM_GROUPS.call2, ...SYSTEM_GROUPS.call3]
  let userPrompt = buildUserPrompt(calcResult.client_data, calcResult.analyses, allSystems, birthData)

  if (isRetry && missingParts?.length) {
    userPrompt += `\n\n【重要提醒——你上次漏掉了以下章節，這次必須全部補上】\n${missingParts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n不要寫任何前言，直接從章節標題開始。`
  }

  const maxTokens = isRetry ? 32768 : 16384
  const systemPrompt = buildCall4Prompt(ageGroup, birthData.name, birthData.locale)

  const result = await callAIWithFallback(systemPrompt, userPrompt, maxTokens, 'Call D')
  result.content = cleanAIResponse(result.content)
  return result
}
aiGenerateCall4.maxRetries = 3

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

// ── Step 3.5: 自動品質閘門 ──
// 檢查報告完整性：15 系統覆蓋、禁止字眼、句子截斷
export async function qualityGate(
  reportContent: string, planCode: string, systemsCount: number,
) {
  "use step";
  await emitProgress({ step: '品質檢查', progress: 70, message: '正在執行品質閘門檢查...' })

  const warnings: string[] = []

  // 1. 系統數量檢查（C 方案需 15 套）
  if (planCode === 'C' && systemsCount < 15) {
    warnings.push(`排盤系統不足: 期望 15 套，實際 ${systemsCount} 套`)
  }

  // 2. C 方案必要章節檢查
  if (planCode === 'C') {
    const requiredSections = [
      { pattern: /命格總覽/, name: '命格總覽' },
      { pattern: /好的地方|天賦優勢/, name: '好的地方' },
      { pattern: /需要注意/, name: '需要注意的地方' },
      { pattern: /改善建議|改善方案/, name: '改善建議' },
      { pattern: /刻意練習/, name: '刻意練習' },
      { pattern: /寫給.*的話/, name: '寫給你的話' },
    ]
    for (const sec of requiredSections) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`缺少必要章節: ${sec.name}`)
      }
    }

    // 2b. 每個命理系統章節必須包含「好的地方」「需要注意」「改善建議」
    const systemNames = [
      '八字', '紫微', '奇門', '風水', '姓名學', '西洋占星', '吠陀占星',
      '易經', '人類圖', '塔羅', '數字能量', '古典占星', '生肖', '生物節律', '南洋術數',
    ]
    // 按 ## 切分章節
    const chapters = reportContent.split(/^## /m).slice(1)
    for (const sysName of systemNames) {
      const sysChapter = chapters.find(ch => ch.startsWith(sysName) || ch.includes(sysName))
      if (!sysChapter) continue // 系統不在報告中（不在此檢查，由系統數量檢查負責）
      const hasPositive = /好的地方|好的方面|優勢|優點|天賦/.test(sysChapter)
      const hasCaution = /需要注意|需注意|注意的地方|風險|挑戰/.test(sysChapter)
      const hasImprovement = /改善方案|改善建議|改善|建議|行動指南/.test(sysChapter)
      if (!hasPositive) warnings.push(`${sysName}: 缺少「好的地方」子章節`)
      if (!hasCaution) warnings.push(`${sysName}: 缺少「需要注意」子章節`)
      if (!hasImprovement) warnings.push(`${sysName}: 缺少「改善建議」子章節`)
    }
  }

  // 3. 禁止字眼檢查（命理報告禁用語）
  const forbiddenPatterns = [
    { pattern: /命中注定/, replacement: '命盤顯示傾向' },
    { pattern: /這輩子就是/, replacement: '目前的命格走向' },
    { pattern: /前世業障/, replacement: '命格中的成長課題' },
    { pattern: /別想太多/, replacement: '你的感受是合理的' },
    { pattern: /想開一點/, replacement: '你的感受是合理的' },
  ]
  for (const fp of forbiddenPatterns) {
    if (fp.pattern.test(reportContent)) {
      warnings.push(`含有禁止字眼: "${fp.pattern.source}" (應改為 "${fp.replacement}")`)
    }
  }

  // 4. 句子截斷檢查（報告末尾不應以不完整句子結束）
  const trimmedEnd = reportContent.trim()
  const lastChar = trimmedEnd[trimmedEnd.length - 1]
  if (lastChar && !/[。！？」\n\r*]/.test(lastChar)) {
    warnings.push(`報告可能被截斷: 末尾字元為 "${lastChar}"（非句末標點）`)
  }

  // 5. 內容長度檢查
  if (planCode === 'C' && reportContent.length < 15000) {
    warnings.push(`C 方案內容偏短: ${reportContent.length} 字（期望 > 15,000 字）`)
  }

  const passed = warnings.filter(w => !w.startsWith('含有禁止字眼')).length === 0
  console.log(`品質閘門: ${passed ? '通過' : '警告'} (${warnings.length} 項)`)
  return { passed, warnings }
}

// ── Step 3.5: AI 審核員（用客戶視角審查報告品質）──
export async function aiReviewReport(reportContent: string, planCode: string): Promise<{ score: number; issues: string[] }> {
  "use step";
  if (planCode !== 'C') return { score: 85, issues: [] } // 非 C 方案跳過 AI 審核

  await emitProgress({ step: 'AI審核', progress: 72, message: '正在進行品質審核...' })

  const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''

  try {
    const res = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `你是一個花了 $89 買命理報告的客戶。請審查以下報告的前 3000 字，回答：

1. 30秒內能找到重點嗎？（是/否+原因）
2. 有看不懂的術語嗎？（列出最多3個）
3. 有亂碼/標籤/截斷嗎？（列出）
4. 改善建議具體嗎？（是/否）
5. 總分（1-100）

只回 JSON 格式：{"score":85,"issues":["問題1","問題2"]}
如果沒問題：{"score":90,"issues":[]}

報告內容（前3000字）：
${reportContent.slice(0, 3000)}`
        }]
      })
    })

    if (!res.ok) return { score: 80, issues: ['AI審核API失敗'] }
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''

    // 嘗試解析 JSON
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const result = JSON.parse(match[0])
      console.log(`AI 審核分數: ${result.score}, 問題: ${result.issues?.length || 0}`)
      return { score: result.score || 80, issues: result.issues || [] }
    }
    return { score: 80, issues: [] }
  } catch (e) {
    console.error('AI 審核失敗:', e)
    return { score: 80, issues: [] } // 審核失敗不阻塞
  }
}

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
