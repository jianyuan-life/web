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

  // 6. __TABLE__ 原始標記清理（AI 不應該回吐排盤原始數據的表格標記）
  // 把 __TABLE__ 行轉成可讀的格式：__TABLE__ key1 val1 key2 val2 → 「key1：val1｜key2：val2」
  cleaned = cleaned.replace(/^__TABLE__\s+(.+)$/gm, (_match, content) => {
    const parts = content.trim().split(/\s{2,}/)
    if (parts.length >= 4) {
      // 偶數個 token → key-value 對
      const pairs: string[] = []
      for (let i = 0; i < parts.length - 1; i += 2) {
        pairs.push(`**${parts[i]}**：${parts[i + 1]}`)
      }
      return pairs.join('　｜　')
    }
    // 奇數個 token → 用分隔符連接
    return parts.join('　｜　')
  })

  // 7. Markdown 垃圾
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
  // G15 家族方案（舊版 family 模式）安全防護：多人 birthData 不能走單人 prompt
  if (birthData.plan_type === 'family' && Array.isArray(birthData.members)) {
    let memberPrompts = '家庭成員資料：\n'
    for (const m of birthData.members as Array<{ name?: string; gender?: string; year?: number; month?: number; day?: number; hour?: number }>) {
      memberPrompts += `\n【${m.name || ''}】${m.gender === 'M' ? '男' : '女'}，${m.year}年${m.month}月${m.day}日${m.hour}時\n`
    }
    memberPrompts += `\n八字：${cd.bazi || ''} | 用神：${cd.yongshen || ''} | 五行：${JSON.stringify(cd.five_elements || {})}\n`
    memberPrompts += `${analyses.length}套系統排盤完整數據：\n`
    // 繼續走下方分析資料拼接
    let userPrompt = memberPrompts
    for (const a of analyses.slice(0, 15)) {
      userPrompt += `\n【${a.system}】評分：${a.score}分`
      if (a.summary) userPrompt += `\n摘要：${a.summary}`
    }
    if (topic) userPrompt += `\n分析方向：${topic}\n`
    if (question) userPrompt += `客戶問題描述：${question}\n`
    return userPrompt
  }

  let userPrompt = `${birthData.name || ''}，${birthData.gender === 'M' ? '男' : '女'}，${birthData.year}年${birthData.month}月${birthData.day}日${birthData.hour}時
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

  // 報告生成日期：讓 AI 知道「今天」是哪天，避免推薦過去的日期
  const generationDate = new Date().toISOString().split('T')[0]
  userPrompt += `\n【報告生成日期】${generationDate}\nTop5 吉時只能推薦此日期之後（含當天）的日期，不可推薦已經過去的日期。\n`

  // 出門訣時間限制：客戶選的可配合時段
  if (birthData.available_time_slots && Array.isArray(birthData.available_time_slots) && birthData.available_time_slots.length > 0) {
    const slotsDesc = birthData.available_time_slots.map((s: { start?: string; end?: string }) => `${s.start || ''}~${s.end || ''}`).join('、')
    userPrompt += `\n【重要】客戶只有以下時段有空出門：${slotsDesc}\nTop5 吉時必須只推薦在這些時段內的時機，不可推薦客戶無法出門的時段。\n`
  }

  // E1 事件時間範圍
  if (birthData.event_start_date) {
    userPrompt += `\n事件時間範圍：${birthData.event_start_date} 至 ${birthData.event_end_date || birthData.event_start_date}\n`
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

// ── 付費報告 AI 呼叫（只用 Claude Opus，不降級）──
// 客戶付了錢，就必須給最高品質。Claude 沒額度就報錯，不給次級品質。
async function callClaudeOnly(
  systemPrompt: string, userPrompt: string, maxTokens: number, label: string,
): Promise<{ content: string; model: string }> {
  if (!CLAUDE_API_KEY) {
    throw new FatalError(`${label}: 缺少 CLAUDE_API_KEY，付費報告必須使用 Claude Opus。請到 console.anthropic.com 充值。`)
  }
  const content = await claudeStreamingCall(systemPrompt, userPrompt, maxTokens)
  console.log(`${label} 完成 (claude-opus-4-6): ${content.length} 字`)
  return { content, model: 'claude-opus-4-6' }
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

  const result = await callClaudeOnly(systemPrompt, userPrompt, 24000, 'Call A')
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

  const result = await callClaudeOnly(systemPrompt, userPrompt, 20000, 'Call B')
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

  const result = await callClaudeOnly(systemPrompt, userPrompt, 20000, 'Call C')
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

  const maxTokens = isRetry ? 32768 : 24000
  const systemPrompt = buildCall4Prompt(ageGroup, birthData.name, birthData.locale)

  const result = await callClaudeOnly(systemPrompt, userPrompt, maxTokens, 'Call D')
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

  // 付費報告只用 Claude Opus，不降級
  if (!CLAUDE_API_KEY) {
    throw new FatalError(`方案 ${planCode}: 缺少 CLAUDE_API_KEY，付費報告必須使用 Claude Opus。請到 console.anthropic.com 充值。`)
  }
  const content = await claudeStreamingCall(localizedPrompt, userPrompt, 32768)
  const cleaned = cleanAIResponse(content)
  console.log(`方案 ${planCode} AI 完成 (claude-opus-4-6): ${cleaned.length} 字`)
  return { content: cleaned, model: 'claude-opus-4-6' }
}
aiGenerateGeneric.maxRetries = 2

// ── G15 家族藍圖：載入家庭成員的已完成人生藍圖報告 ──
export interface FamilyMemberReport {
  email: string
  name: string
  reportContent: string
  birthData: BirthData
}

export async function loadFamilyReports(
  memberEmails: string[], memberNames: string[],
): Promise<FamilyMemberReport[]> {
  "use step";
  await emitProgress({ step: '載入資料', progress: 10, message: '正在載入家庭成員的人生藍圖報告...' })

  const supabase = getSupabase()
  const results: FamilyMemberReport[] = []

  for (let i = 0; i < memberEmails.length; i++) {
    const email = memberEmails[i].trim().toLowerCase()
    const { data, error } = await supabase
      .from('paid_reports')
      .select('client_name, report_result, birth_data')
      .eq('customer_email', email)
      .eq('plan_code', 'C')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      throw new FatalError(`找不到 ${email} 的已完成人生藍圖報告`)
    }

    results.push({
      email,
      name: data.client_name || memberNames[i] || '',
      reportContent: typeof data.report_result === 'string'
        ? data.report_result
        : JSON.stringify(data.report_result || ''),
      birthData: data.birth_data as BirthData,
    })
  }

  console.log(`載入 ${results.length} 份家庭成員報告`)
  return results
}
loadFamilyReports.maxRetries = 2

// ── G15 家族藍圖（新版）：用 report ID 直接載入成員報告 ──
export async function loadFamilyReportsByIds(
  reportIds: string[], memberNames: string[],
): Promise<FamilyMemberReport[]> {
  "use step";
  await emitProgress({ step: '載入資料', progress: 10, message: '正在載入家庭成員的人生藍圖報告...' })

  const supabase = getSupabase()
  const results: FamilyMemberReport[] = []

  for (let i = 0; i < reportIds.length; i++) {
    const { data, error } = await supabase
      .from('paid_reports')
      .select('client_name, report_result, birth_data, customer_email')
      .eq('id', reportIds[i])
      .eq('plan_code', 'C')
      .eq('status', 'completed')
      .single()

    if (error || !data) {
      throw new FatalError(`找不到報告 ID: ${reportIds[i]} 的已完成人生藍圖`)
    }

    results.push({
      email: data.customer_email || '',
      name: data.client_name || memberNames[i] || '',
      reportContent: typeof data.report_result === 'string'
        ? data.report_result
        : JSON.stringify(data.report_result || ''),
      birthData: data.birth_data as BirthData,
    })
  }

  console.log(`載入 ${results.length} 份家庭成員報告（by ID）`)
  return results
}
loadFamilyReportsByIds.maxRetries = 2

// ── G15 家族藍圖：從報告中提取互動關鍵數據（不餵原文，避免 AI 重複個人分析）──
function extractKeyDataForFamily(reportContent: string, bd: BirthData): string {
  const lines: string[] = []

  // 基本出生資料（從 birthData 直接取，最可靠）
  if (bd.year && bd.month && bd.day) {
    lines.push(`出生：${bd.year}年${bd.month}月${bd.day}日${bd.hour || '未知'}時`)
  }

  // 從報告中用 regex 提取各系統關鍵數據（每個系統取第一段摘要）
  const systemPatterns: Array<{ name: string; pattern: RegExp }> = [
    { name: '八字', pattern: /(?:八字|四柱)[：:]\s*(.+?)(?:\n|$)/i },
    { name: '用神', pattern: /用神[：:]\s*(.+?)(?:\n|$)/i },
    { name: '五行', pattern: /五行[：:]\s*(.+?)(?:\n|$)/i },
    { name: '日主', pattern: /日主[為是]\s*(.+?)(?:\n|[，,。])/i },
    { name: '日柱', pattern: /日柱[：:為是]\s*(.+?)(?:\n|[，,。])/i },
    { name: '紫微命宮', pattern: /命宮[：:主星]*\s*(.+?)(?:\n|[，,。])/i },
    { name: '夫妻宮', pattern: /夫妻宮[：:主星]*\s*(.+?)(?:\n|[，,。])/i },
    { name: '子女宮', pattern: /子女宮[：:主星]*\s*(.+?)(?:\n|[，,。])/i },
    { name: '生肖', pattern: /生肖[：:為是]\s*(.+?)(?:\n|[，,。])/i },
    { name: '人類圖類型', pattern: /(?:人類圖|類型)[：:]\s*(.+?)(?:\n|[，,。])/i },
    { name: '人類圖權威', pattern: /(?:內在權威|權威)[：:]\s*(.+?)(?:\n|[，,。])/i },
    { name: '西洋太陽', pattern: /太陽[星座：:]*\s*(.+?)(?:\n|[，,。])/i },
    { name: '西洋月亮', pattern: /月亮[星座：:]*\s*(.+?)(?:\n|[，,。])/i },
    { name: '生命靈數', pattern: /(?:生命靈數|靈數)[：:為是]\s*(.+?)(?:\n|[，,。])/i },
    { name: '納音', pattern: /納音[：:]\s*(.+?)(?:\n|[，,。])/i },
  ]

  for (const sp of systemPatterns) {
    const match = reportContent.match(sp.pattern)
    if (match?.[1]) {
      // 只取前 80 字，避免過長
      lines.push(`${sp.name}：${match[1].trim().slice(0, 80)}`)
    }
  }

  // 如果 regex 提取結果太少（< 5 項），補充從報告各系統章節取前 2 行
  if (lines.length < 5) {
    const sectionPattern = /【(.+?)】[^\n]*\n([^\n]*\n?[^\n]*)/g
    let sectionMatch
    let extraCount = 0
    while ((sectionMatch = sectionPattern.exec(reportContent)) !== null && extraCount < 8) {
      const sectionName = sectionMatch[1].trim()
      const sectionContent = sectionMatch[2].trim().slice(0, 150)
      if (sectionContent && !lines.some(l => l.includes(sectionName))) {
        lines.push(`${sectionName}：${sectionContent}`)
        extraCount++
      }
    }
  }

  return lines.length > 0 ? lines.join('\n') : reportContent.slice(0, 1000)
}

// ── G15 家族藍圖：AI 生成家族互動分析 ──
export async function aiGenerateG15(
  familyReports: FamilyMemberReport[], planCode: string, systemPrompt: string,
) {
  "use step";
  await emitProgress({ step: 'AI分析', progress: 30, message: '正在分析家族成員互動關係...' })

  // 從報告中提取關鍵互動數據，不餵原始報告全文（避免 AI 重複個人分析）
  let userPrompt = `家族藍圖分析 — 共 ${familyReports.length} 位成員\n\n`

  for (let i = 0; i < familyReports.length; i++) {
    const member = familyReports[i]
    const bd = member.birthData
    userPrompt += `=== 成員${i + 1}：${member.name} ===\n`
    userPrompt += `性別：${bd.gender === 'M' ? '男' : '女'}，出生：${bd.year}年${bd.month}月${bd.day}日${bd.hour}時\n`

    // 從報告中提取各系統關鍵數據摘要（每人約 200-300 字）
    const keyData = extractKeyDataForFamily(member.reportContent, bd)
    userPrompt += `命理關鍵數據：\n${keyData}\n\n`
  }

  userPrompt += `\n請根據以上所有成員的命理關鍵數據，撰寫完整的家族互動分析報告。
重要提醒：
1. 你收到的是每位成員的關鍵命理數據摘要，不是完整報告。不要試圖重寫個人命格分析。
2. 所有分析必須是成員之間的互動比較，不是個人特質描述。例如：「A的日主甲木與B的日主庚金形成甲庚沖」，而不是「A是甲木，性格正直」。
3. 著重分析成員之間的能量互補或衝突、相處模式、溝通建議。
4. 每個論點都必須引用具體的命理數據來支撐（如日柱、命宮主星、生肖關係等）。`

  const localizedPrompt = localizePrompt(systemPrompt, familyReports[0]?.birthData?.locale)

  if (!CLAUDE_API_KEY) {
    throw new FatalError('G15 家族藍圖：缺少 CLAUDE_API_KEY，付費報告必須使用 Claude Opus。')
  }
  const content = await claudeStreamingCall(localizedPrompt, userPrompt, 32768)
  const cleaned = cleanAIResponse(content)
  console.log(`G15 家族藍圖 AI 完成: ${cleaned.length} 字`)
  return { content: cleaned, model: 'claude-opus-4-6' }
}
aiGenerateG15.maxRetries = 2

// ── R 方案「合否？」：為每位成員分別排盤，合併後 AI 生成合盤分析 ──
export async function aiGenerateR(
  memberResults: CalcResult[], birthData: BirthData, systemPrompt: string,
) {
  "use step";
  await emitProgress({ step: 'AI分析', progress: 40, message: '正在分析雙方命格合盤...' })

  const members = (birthData.members || []) as Array<{
    name?: string; gender?: string; year?: number; month?: number; day?: number; hour?: number
  }>
  const relationDescription = (birthData.relation_description || birthData.relation || '') as string

  let userPrompt = `合否？關係合盤分析 — 共 ${members.length} 位成員\n\n`

  // 如果有關係描述，先放在最前面
  if (relationDescription) {
    userPrompt += `【關係描述】${relationDescription}\n\n`
  }

  // 逐一列出每位成員的排盤數據
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const calc = memberResults[i]
    if (!calc) continue

    userPrompt += `=== 成員${i + 1}：${member.name || ''} ===\n`
    userPrompt += `性別：${member.gender === 'M' ? '男' : '女'}，出生：${member.year}年${member.month}月${member.day}日${member.hour}時\n`

    const cd = calc.client_data || {}
    userPrompt += `八字：${cd.bazi || ''} | 用神：${cd.yongshen || ''} | 五行：${JSON.stringify(cd.five_elements || {})}\n`
    userPrompt += `農曆：${cd.lunar_date || ''} | 納音：${cd.nayin || ''} | 命宮：${cd.ming_gong || ''}\n`

    const analyses = calc.analyses || []
    userPrompt += `${analyses.length} 套系統排盤數據：\n`
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
      userPrompt += '\n'
    }
    userPrompt += '\n'
  }

  userPrompt += `\n請根據以上所有成員的排盤數據，撰寫完整的關係合盤分析報告。
重要提醒：
1. 所有分析必須基於排盤數據中的具體結果，不得編造。
2. 每個分析論點都必須引用至少一個系統的具體合盤結果。
3. 相容度總分必須是 0-100 的整數，根據七大系統加權計算得出。
4. 現在是2026年丙午年。
5. 好的地方和需要注意的地方都必須涉及雙方互動，不是個人特質描述。`

  const localizedPrompt = localizePrompt(systemPrompt, birthData.locale)

  if (!CLAUDE_API_KEY) {
    throw new FatalError('R 方案合否：缺少 CLAUDE_API_KEY，付費報告必須使用 Claude Opus。')
  }
  const content = await claudeStreamingCall(localizedPrompt, userPrompt, 32768)
  const cleaned = cleanAIResponse(content)
  console.log(`R 方案合否 AI 完成: ${cleaned.length} 字`)
  return { content: cleaned, model: 'claude-opus-4-6' }
}
aiGenerateR.maxRetries = 2

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

  // PDF 專用預處理：清除殘留橫線（各種變體）
  const pdfContent = reportContent
    .replace(/^---+$/gm, '')           // 標準 markdown 橫線
    .replace(/^___+$/gm, '')           // 底線型橫線
    .replace(/^\*\*\*+$/gm, '')        // 星號型橫線
    .replace(/^[\s]*[-─—═]+[\s]*$/gm, '') // 全形橫線/裝飾線
    .replace(/\n{3,}/g, '\n\n')        // 清理後的連續空行

  const pdfRes = await fetch(`${PYTHON_API}/api/generate-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_id: reportId,
      plan_code: planCode,
      client_name: birthData.plan_type === 'family_email' || birthData.plan_type === 'family_reports'
        ? ((birthData.member_names as string[] | undefined)?.filter(Boolean).join('、') || 'Unknown')
        : birthData.plan_type === 'family'
        ? ((birthData.members as Array<{ name?: string }> | undefined)?.map(m => m.name).filter(Boolean).join('、') || 'Unknown')
        : (birthData.name || 'Unknown'),
      plan_name: planName,
      ai_content: pdfContent,
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

  // 2c. E1/E2 出門訣必要章節檢查
  if (planCode === 'E1' || planCode === 'E2') {
    const e1e2Required = [
      { pattern: /事件吉凶|事件命理|本月運勢|本月命理/, name: planCode === 'E1' ? '事件吉凶分析' : '本月運勢概覽' },
      { pattern: /好的地方|優勢|有利/, name: '好的地方' },
      { pattern: /需要注意|注意|風險/, name: '需要注意的地方' },
      { pattern: /改善|建議|行動/, name: '改善建議' },
      { pattern: /補運|操作指南/, name: '補運操作指南' },
      { pattern: /忌方|忌日|注意事項/, name: '忌方忌日' },
    ]
    for (const sec of e1e2Required) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`出門訣缺少必要章節: ${sec.name}`)
      }
    }
    // Top5 JSON 檢查
    if (!/===TOP5_JSON_START===/.test(reportContent)) {
      warnings.push('出門訣缺少 Top5 吉時 JSON 區塊')
    }
    // 內容長度檢查
    if (reportContent.length < 3000) {
      warnings.push(`出門訣內容偏短: ${reportContent.length} 字（期望 > 3,000 字）`)
    }
  }

  // 2d. R 方案「合否？」必要章節檢查
  if (planCode === 'R') {
    const rRequired = [
      { pattern: /相容度總評/, name: '相容度總評' },
      { pattern: /好的地方/, name: '好的地方' },
      { pattern: /需要注意/, name: '需要注意的地方' },
      { pattern: /改善建議/, name: '改善建議' },
      { pattern: /刻意練習/, name: '刻意練習' },
    ]
    for (const sec of rRequired) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`合否缺少必要章節: ${sec.name}`)
      }
    }
    // 相容度分數檢查
    const scoreMatch = reportContent.match(/相容度總分\s*[:：]?\s*(\d+)\s*[/／]?\s*100/)
    if (!scoreMatch) {
      warnings.push('合否缺少相容度總分（格式：XX/100）')
    } else {
      const score = parseInt(scoreMatch[1])
      if (score < 0 || score > 100) {
        warnings.push(`合否相容度分數異常: ${score}（應在 0-100 之間）`)
      }
    }
    // 內容長度檢查
    if (reportContent.length < 8000) {
      warnings.push(`合否內容偏短: ${reportContent.length} 字（期望 > 8,000 字）`)
    }
  }

  // 2e. G15 家族藍圖必要章節檢查
  if (planCode === 'G15') {
    const g15Required = [
      { pattern: /家族能量|能量圖譜/, name: '家族能量圖譜' },
      { pattern: /互動關係|成員互動/, name: '成員互動關係深度分析' },
      { pattern: /溝通模式/, name: '家庭溝通模式' },
      { pattern: /家運走勢|家運/, name: '家運走勢' },
      { pattern: /行動指南|家族行動/, name: '家族行動指南' },
      { pattern: /寫給.*家|寫給這個家/, name: '寫給這個家的話' },
    ]
    for (const sec of g15Required) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`家族藍圖缺少必要章節: ${sec.name}`)
      }
    }
    // 內容長度檢查（依家庭人數）
    if (reportContent.length < 4000) {
      warnings.push(`家族藍圖內容偏短: ${reportContent.length} 字（期望 > 4,000 字）`)
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
  if (!['C', 'R', 'E1', 'E2', 'G15'].includes(planCode)) return { score: 85, issues: [] } // D 方案跳過 AI 審核

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
    brand: isCN ? '鉴 源' : '鑒 源',
    subtitle: isCN ? 'JIANYUAN · 东西方命理整合平台' : 'JIANYUAN · 東西方命理整合平台',
    notice: isCN ? '✦ 报告完成通知' : '✦ 報告完成通知',
    title: (() => {
      const displayName = birthData.plan_type === 'family_email' || birthData.plan_type === 'family_reports'
        ? ((birthData.member_names as string[] | undefined)?.filter(Boolean).join('、') || '')
        : birthData.plan_type === 'family'
        ? ((birthData.members as Array<{ name?: string }> | undefined)?.map(m => m.name).filter(Boolean).join('、') || '')
        : (birthData.name || '')
      return isCN ? `${displayName}，您的报告已完成` : `${displayName}，您的報告已完成`
    })(),
    systemCount: ['E1', 'E2'].includes(planCode)
      ? (isCN ? `${planName} · 奇门遁甲精算` : `${planName} · 奇門遁甲精算`)
      : planCode === 'G15'
      ? (isCN ? `${planName} · 家族互动分析` : `${planName} · 家族互動分析`)
      : (isCN ? `${planName} · ${analysesCount} 套命理系统分析` : `${planName} · ${analysesCount} 套命理系統分析`),
    cta: isCN ? '查看完整报告 →' : '查看完整報告 →',
    linkNote: isCN ? '此链接专属于您，无需登录即可查看' : '此連結專屬於您，無需登入即可查看',
    promoTitle: isCN ? '🧭 加强您的命理能量' : '🧭 加強您的命理能量',
    promoBody: isCN
      ? '报告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出门诀</strong>能让您在最佳时机、最佳方位行动，将命理能量转化为现实中的改变。许多客户在使用出门诀后，事业和财运都有显著提升。'
      : '報告揭示了您的命格能量，而<strong style="color:#e5e7eb;">出門訣</strong>能讓您在最佳時機、最佳方位行動，將命理能量轉化為現實中的改變。許多客戶在使用出門訣後，事業和財運都有顯著提升。',
    promoLink: isCN ? '了解出门诀方案 →' : '了解出門訣方案 →',
    footer: isCN ? '如有任何问题，请联系' : '如有任何問題，請聯繫',
    copyright: isCN ? '© 2026 鉴源命理平台 · jianyuan.life' : '© 2026 鑒源命理平台 · jianyuan.life',
    subject: (() => {
      const subjectName = birthData.plan_type === 'family_email' || birthData.plan_type === 'family_reports'
        ? ((birthData.member_names as string[] | undefined)?.filter(Boolean).join('、') || '')
        : birthData.plan_type === 'family'
        ? ((birthData.members as Array<{ name?: string }> | undefined)?.map(m => m.name).filter(Boolean).join('、') || '')
        : (birthData.name || '')
      return isCN
        ? `【鉴源命理】您的${planName}报告已完成 — ${subjectName}`
        : `【鑒源命理】您的${planName}報告已完成 — ${subjectName}`
    })(),
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

// ── Step 6: 標記失敗 + 發送告警 Email ──
export async function markReportFailed(reportId: string, errorMessage: string) {
  "use step";
  const supabase = getSupabase()
  await supabase.from('paid_reports').update({
    status: 'failed',
    error_message: errorMessage,
  }).eq('id', reportId)
  console.error(`報告 ${reportId} 標記為失敗: ${errorMessage}`)

  // 發送告警 Email 通知管理員
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || '')
    await resend.emails.send({
      from: '鑒源系統告警 <reports@jianyuan.life>',
      to: 'support@jianyuan.life',
      subject: `⚠️ 報告生成失敗：${reportId.slice(0, 8)}`,
      html: `
        <h2>報告生成失敗告警</h2>
        <p><strong>報告 ID：</strong>${reportId}</p>
        <p><strong>錯誤訊息：</strong>${errorMessage}</p>
        <p><strong>時間：</strong>${new Date().toISOString()}</p>
        <hr />
        <p>請前往 <a href="https://jianyuan.life/admin">管理後台</a> 查看並處理。</p>
      `,
    })
    console.log(`📧 告警 Email 已發送（報告 ${reportId}）`)
  } catch (emailErr) {
    // 告警 Email 失敗不影響主流程
    console.error('告警 Email 發送失敗:', emailErr)
  }
}

// ── Step: 關閉進度串流 ──
export async function closeProgressStream() {
  "use step";
  const writable = getWritable<ProgressUpdate>()
  await writable.close()
}

// ── 匯出輔助常數（供 workflow 使用） ──
export { PLAN_SYSTEM_PROMPT } from './plan-prompts'
