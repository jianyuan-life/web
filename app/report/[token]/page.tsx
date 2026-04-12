import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReportClientButtons from './ReportClientButtons'
import ReportTracker from './ReportTracker'
import ReportFeedback from '@/components/ReportFeedback'
import SectionExpander from '@/components/SectionExpander'

// ============================================================
// 報告閱讀頁 — 透過 access_token 讀取真實報告（無需登入）
// 全新設計：結構化三大區塊 + 評分橫條圖 + 品牌色系
// ============================================================

interface Top5Timing {
  rank: number
  title: string
  date: string        // YYYY-MM-DD
  time_start: string  // HH:MM
  time_end: string    // HH:MM
  direction: string
  reason: string
  confidence?: string     // v3.0 信心指數（如「極高 95%」）
  shensha_warning?: string // v3.0 神煞警告（如「注意：此方位接近三煞方」）
  zhishi_info?: string     // v3.0 值使門資訊（如「值使門：開門，利出行」）
}

interface ReportData {
  id: string
  client_name: string
  customer_email: string
  plan_code: string
  amount_usd: number
  pdf_url: string | null
  birth_data: {
    name: string
    year: number
    month: number
    day: number
    hour?: number
    gender: string
    locale?: string
    plan_type?: string
    plan?: string
    member_names?: string[]
    member_emails?: string[]
    members?: Array<{ name?: string; gender?: string }>
    relation_description?: string
  }
  report_result: {
    ai_content: string
    systems_count: number
    analyses_summary: { system: string; score: number }[]
    top5_timings?: Top5Timing[]
  }
  status: string
  created_at: string
}

const PLAN_NAMES: Record<string, string> = {
  C: '人生藍圖', D: '心之所惑',
  G15: '家族藍圖', R: '合否？',
  E1: '事件出門訣', E2: '月盤出門訣',
}

// 將 AI markdown 內容解析為結構化區塊
interface ContentSection {
  type: 'positive' | 'caution' | 'improvement' | 'general'
  title: string
  content: string
}

// 判斷是否為主題式報告（新版按主題分列，非按命理系統分列）
function isThematicReport(markdown: string, reportResult: ReportData['report_result']): boolean {
  // 檢查 report_result 中是否有 personality_card 欄位
  if (reportResult && 'personality_card' in reportResult) return true
  // 檢查第一章標題是否是「命格名片」
  if (/^##?\s*[一二三四五六七八九十]+、\s*命格名片/m.test(markdown)) return true
  // 檢查是否含有主題式標題格式（中文數字編號）
  const thematicPattern = /^##?\s*[一二三四五六七八九十]+、/m
  const matches = markdown.match(new RegExp(thematicPattern.source, 'gm'))
  return (matches?.length || 0) >= 3
}

// 命格名片數據結構
interface PersonalityCardData {
  title: string        // 人格封號
  definition?: string  // 一句話定義你
  talents: string[]    // 天賦 Top 3
  challenges: string[] // 課題 Top 3
  firstImpression?: string  // 第一印象
  trueself?: string         // 真實的你
  keywords?: string[]  // 關鍵字（5個詞）
  yearTheme?: string   // 2026一句話
  rawContent: string   // 原始內容（fallback 用）
}

// 從 markdown 中提取命格名片數據
function parsePersonalityCard(markdown: string): PersonalityCardData | null {
  // 嘗試匹配「命格名片」章節（支援 ## 一、命格名片 或 ## 命格名片）
  const cardMatch = markdown.match(/^##?\s*(?:[一二三四五六七八九十]+、\s*)?命格名片\s*\n([\s\S]*?)(?=\n##?\s|$)/m)
  if (!cardMatch) return null

  const content = cardMatch[1].trim()
  // 同時搜尋全文（封號可能在人生速覽或其他章節）
  const fullText = markdown

  // 輔助函式：清除 markdown 粗體和前導編號
  const cleanMd = (s: string) => s.replace(/\*{1,2}/g, '').replace(/^[\d]+\.\s*/, '').trim()

  // 提取人格封號（擴大搜尋範圍到全文）
  let title = ''
  // 先在命格名片章節找（支援「命格封號：精鋼利刃」同行格式）
  const titleMatch = content.match(/(?:人格封號|命格封號|你的封號)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
  if (titleMatch) {
    title = cleanMd(titleMatch[1])
  }
  // 支援「### 1. 命格封號」標題格式，封號在下一行粗體（如「**江河大海**」）
  if (!title) {
    const headingTitleMatch = content.match(/(?:人格封號|命格封號|你的封號)\s*\n+\s*\*{1,2}([^*\n]+?)\*{1,2}/m)
    if (headingTitleMatch) title = cleanMd(headingTitleMatch[1])
  }
  if (!title) {
    // 在全文找封號（可能在人生速覽等其他章節）
    const globalTitleMatch = fullText.match(/(?:人格封號|命格封號|你的封號|封號)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
      || fullText.match(/命格就像[^，,]*?\*{0,2}(.{2,8}(?:利刃|大樹|烈火|星光|磐石|清風|深海|明月|雷霆|瀑布|鑽石|寶劍|孤狼|鳳凰|蛟龍|精鋼))\*{0,2}/)
      || fullText.match(/「(.{2,6})」(?:的命格|命格)/)
    if (globalTitleMatch) title = cleanMd(globalTitleMatch[1])
    else {
      // fallback：第一個 ### 標題或第一個粗體行
      const h3Match = content.match(/^###?\s*(.+?)$/m)
      const boldMatch = content.match(/^\*\*(.+?)\*\*\s*$/m)
      if (h3Match) title = cleanMd(h3Match[1])
      else if (boldMatch) title = cleanMd(boldMatch[1])
    }
  }

  // 提取「一句話定義你」
  // AI 格式多樣：「一句話定義你：...」同行 / 標題後下一行粗體 / 引言框
  let definition: string | undefined
  const defMatch = content.match(/一句話定義[你您]?\*{0,2}[：:]\s*(.+?)$/m)
  if (defMatch) {
    definition = cleanMd(defMatch[1]).replace(/^[「「"']|[」」"']$/g, '')
  }
  // 支援「### 2. 一句話定義你」標題格式，定義在下一行（可能是粗體或普通段落）
  if (!definition) {
    const defHeadingMatch = content.match(/一句話定義[你您]?\s*\n+\s*\*{0,2}([^#\n][^\n]{5,150}?)\*{0,2}\s*$/m)
    if (defHeadingMatch) definition = cleanMd(defHeadingMatch[1]).replace(/^[「「"']|[」」"']$/g, '')
  }
  if (!definition) {
    // AI 可能用引言框開頭作為定義（> 「你就是那種...」）
    const quoteMatch = content.match(/^>\s*[「「"']?(.+?)[」」"']?\s*$/m)
      || content.match(/^[「「"'](.{10,100})[」」"']\s*$/m)
    if (quoteMatch) definition = cleanMd(quoteMatch[1]).replace(/^[「「"']|[」」"']$/g, '')
  }

  // 提取天賦 Top 3（從命格名片章節或全文搜尋）
  const talents: string[] = []
  const searchContent = content + '\n' + (fullText.match(/人生速覽[\s\S]*?(?=\n##?\s|$)/)?.[0] || '')
  const talentSection = searchContent.match(/(?:天賦|優勢|天生強項|你最大的天賦)\s*(?:Top\s*\d+)?\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\s*(?:###?\s*\d+\.\s*(?:課題|挑戰|需要注意|第一印象|真實的你|關鍵字|2026|你最該)|(?:課題|挑戰|需要注意|第一印象|真實的你|關鍵字|2026|你最該))|$)/i)
    || searchContent.match(/(?:天賦|優勢)\s*(?:Top\s*\d+)\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\n)/i)
  if (talentSection) {
    for (const line of talentSection[1].split('\n')) {
      // 支援 markdown 表格行：「| 1 | **洞察力碾壓級別** | 八字偏印格... |」
      const tableMatch = line.match(/\|\s*\d+\s*\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|/)
      if (tableMatch) {
        const label = tableMatch[1].trim()
        if (label && label.length > 1 && label.length < 60) talents.push(label)
        continue
      }
      // 支援 bullet / numbered list 格式
      const cleaned = line.replace(/^[\s\-•·*>]+/, '').replace(/\*{1,2}/g, '').trim()
      if (cleaned && cleaned.length > 1 && cleaned.length < 80) {
        // 跳過表格表頭行（排名、天賦、佐證等）
        if (/^[|｜]?\s*排名/.test(cleaned) || /^[-:]+$/.test(cleaned.replace(/\|/g, ''))) continue
        const labelMatch = cleaned.match(/^(.+?)[：:—–]\s*/)
        talents.push(labelMatch ? labelMatch[1].trim() : cleaned)
      }
    }
  }
  // 如果命格名片裡沒找到，嘗試從全文 > 引言框格式提取（「> **你最大的天賦**：...」）
  if (talents.length === 0) {
    const talentQuote = fullText.match(/你最大的天賦\*{0,2}[：:]\s*(.+?)(?:\n|$)/m)
    if (talentQuote) talents.push(cleanMd(talentQuote[1]).slice(0, 40))
  }

  // 提取課題 Top 3
  const challenges: string[] = []
  const challengeSection = searchContent.match(/(?:課題|挑戰|需要注意|你最該注意的課題)\s*(?:Top\s*\d+)?\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\s*(?:###?\s*\d+\.\s*(?:天賦|第一印象|真實的你|關鍵字|2026)|(?:第一印象|真實的你|關鍵字|2026))|$)/i)
    || searchContent.match(/(?:課題|挑戰)\s*(?:Top\s*\d+)\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\n)/i)
  if (challengeSection) {
    for (const line of challengeSection[1].split('\n')) {
      // 支援 markdown 表格行：「| 1 | **孤島症候群** | 八字偏印格... |」
      const tableMatch = line.match(/\|\s*\d+\s*\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|/)
      if (tableMatch) {
        const label = tableMatch[1].trim()
        if (label && label.length > 1 && label.length < 60) challenges.push(label)
        continue
      }
      // 支援 bullet / numbered list 格式
      const cleaned = line.replace(/^[\s\-•·*>]+/, '').replace(/\*{1,2}/g, '').trim()
      if (cleaned && cleaned.length > 1 && cleaned.length < 80) {
        // 跳過表格表頭行
        if (/^[|｜]?\s*排名/.test(cleaned) || /^[-:]+$/.test(cleaned.replace(/\|/g, ''))) continue
        const labelMatch = cleaned.match(/^(.+?)[：:—–]\s*/)
        challenges.push(labelMatch ? labelMatch[1].trim() : cleaned)
      }
    }
  }
  if (challenges.length === 0) {
    const challengeQuote = fullText.match(/你最該注意的課題\*{0,2}[：:]\s*(.+?)(?:\n|$)/m)
    if (challengeQuote) challenges.push(cleanMd(challengeQuote[1]).slice(0, 40))
  }

  // 提取「第一印象」和「真實的你」
  // AI 格式多樣：「第一印象（外在）：...」「- 第一印象：...」或多行段落
  let firstImpression: string | undefined
  let trueself: string | undefined

  // 嘗試單行格式
  const impressionMatch = content.match(/第一印象[（(]?外在[）)]?[：:]\s*(.+?)$/m)
    || content.match(/第一印象[：:]\s*(.+?)$/m)
    // 支援「**別人第一次見你會覺得：** 穩重、...」格式
    || content.match(/別人第一次見你(?:會覺得|的印象)\*{0,2}[：:]\s*\*{0,2}\s*(.+?)$/m)
  if (impressionMatch) firstImpression = cleanMd(impressionMatch[1]).replace(/^[「「"']|[」」"']$/g, '')

  const trueselfMatch = content.match(/真實的你[（(]?內在[）)]?[：:]\s*(.+?)$/m)
    || content.match(/真實的你[：:]\s*(.+?)$/m)
    // 支援「**但其實你：** 內心比任何人...」格式
    || content.match(/但其實你\*{0,2}[：:]\s*\*{0,2}\s*(.+?)$/m)
  if (trueselfMatch) trueself = cleanMd(trueselfMatch[1]).replace(/^[「「"']|[」」"']$/g, '')

  // 如果第一印象/真實的你是多行段落，嘗試提取段落
  if (!firstImpression) {
    const multiMatch = content.match(/第一印象[^：:\n]*[：:]\s*\n([\s\S]*?)(?=\n\s*(?:[-*]?\s*真實的你|$))/m)
    if (multiMatch) {
      const text = multiMatch[1].replace(/\*{1,2}/g, '').replace(/^[\s\-•·*>]+/gm, '').trim()
      if (text.length > 5 && text.length < 300) firstImpression = text.split('\n')[0].trim()
    }
  }
  if (!trueself) {
    const multiMatch = content.match(/真實的你[^：:\n]*[：:]\s*\n([\s\S]*?)(?=\n\s*(?:[-*]?\s*落差|[-*]?\s*\d+\.|關鍵字|2026|$))/m)
    if (multiMatch) {
      const text = multiMatch[1].replace(/\*{1,2}/g, '').replace(/^[\s\-•·*>]+/gm, '').trim()
      if (text.length > 5 && text.length < 300) trueself = text.split('\n')[0].trim()
    }
  }

  // 提取「關鍵字」（5個詞）— 從命格名片或全文搜尋
  let keywords: string[] | undefined
  const kwMatch = content.match(/關鍵字\*{0,2}[：:]\s*(.+?)$/m)
    || fullText.match(/關鍵字\*{0,2}[：:]\s*(.+?)$/m)
    // 支援「### 6. 關鍵字」標題格式，關鍵字在下一行（粗體或普通）
    || content.match(/關鍵字\s*\n+\s*\*{0,2}([^#\n][^\n]+?)\*{0,2}\s*$/m)
    || fullText.match(/關鍵字\s*\n+\s*\*{0,2}([^#\n][^\n]+?)\*{0,2}\s*$/m)
  if (kwMatch) {
    keywords = kwMatch[1].replace(/\*{1,2}/g, '').split(/[、，,／\/|｜∣\s]+/).map(k => k.trim()).filter(k => k.length > 0 && k.length < 20)
  }

  // 提取「2026一句話」— 從命格名片或全文搜尋
  let yearTheme: string | undefined
  const yearMatch = content.match(/2026\s*一句話\*{0,2}[：:]\s*(.+?)$/m)
    || content.match(/2026\s*年?.*?核心主題\*{0,2}[：:]\s*(.+?)$/m)
    || content.match(/2026\s*丙午年?\*{0,2}[：:]\s*(.+?)$/m)
    // 支援「### 7. 2026 一句話」或「### 7. 2026一句話」標題格式，內容在下一行
    || content.match(/2026\s*一句話\s*\n+\s*\*{0,2}([^#\n][^\n]{5,200}?)\*{0,2}\s*$/m)
    || fullText.match(/2026\s*(?:年|丙午年)?你現在該做什麼\*{0,2}[：:]\s*(.+?)$/m)
    || fullText.match(/2026一句話\*{0,2}[：:]\s*(.+?)$/m)
  if (yearMatch) yearTheme = cleanMd(yearMatch[1]).replace(/^[「「"']|[」」"']$/g, '')

  return {
    title: title || '命格名片',
    definition,
    talents: talents.slice(0, 3),
    challenges: challenges.slice(0, 3),
    firstImpression,
    trueself,
    keywords,
    yearTheme,
    rawContent: content,
  }
}

function parseStructuredContent(markdown: string): ContentSection[] {
  const sections: ContentSection[] = []

  // 支援兩種格式：
  // 新版主題式：## 一、命格名片  或  ## 二、你是什麼樣的人
  // 舊版系統式：## 八字分析  或  ## 紫微斗數
  const parts = markdown.split(/^## /gm).filter(Boolean)

  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue
    let title = part.slice(0, newlineIdx).trim()
    const content = part.slice(newlineIdx + 1).trim()
    if (!content) continue

    // 過濾掉「假標題」：超過 35 字元或含中文句子標點的片段是 AI 段落文字，不是章節標題
    if (title.length > 35 || /[。，！？；「」【】]/.test(title)) continue

    let type: ContentSection['type'] = 'general'
    if (/好的地方|好的方面|天賦優勢|你的優勢|你的強項|這個家的祝福|相容性/.test(title)) type = 'positive'
    else if (/需要注意|需要留意|注意的地方|家庭和諧的挑戰|需注意|關係張力/.test(title)) type = 'caution'
    else if (/改善方案|改善建議|行動指南|加持你的運勢|讓家更好|建議詳解|集體建議|刻意練習/.test(title)) type = 'improvement'

    // 清除標題中的字數標注（如「（~3,500字）」「（~2,000字）」）— 客戶不需要看字數
    const cleanTitle = title.replace(/[（(]\s*[~～]?\s*[\d,]+\s*字?\s*[）)]/g, '').trim()
    sections.push({ type, title: cleanTitle, content })
  }

  // 如果沒有用 ## 分段，整份內容作為 general
  if (sections.length === 0 && markdown.trim()) {
    sections.push({ type: 'general', title: '分析報告', content: markdown.trim() })
  }

  return sections
}

// HTML 實體轉義（防止 XSS — AI 生成內容可能包含惡意 HTML）
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 將純文字 markdown 段落轉 HTML（不含 ### 處理）
function renderInlineMarkdown(text: string): string {
  // 先轉義所有 HTML，再套用安全的 markdown 樣式
  let html = escapeHtml(text)
    // 清理 Markdown 殘留和 prompt 結構標籤
    .replace(/^---+$/gm, '')
    .replace(/^\|[-:]+\|[-:| ]*$/gm, '___TABLE_SEP___') // 標記表格分隔線
    // Markdown 表格 → 正式 HTML table
    .replace(/^\|(.+)\|$/gm, (_m: string, inner: string) => {
      const cells = inner.split('|').map(c => c.trim()).filter(Boolean)
      const cellsHtml = cells.map(c => {
        const bold = c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return `<td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;line-height:1.7">${bold}</td>`
      }).join('')
      return `<tr style="transition:background 0.2s" onmouseover="this.style.background='rgba(201,168,76,0.05)'" onmouseout="this.style.background='transparent'">${cellsHtml}</tr>`
    })
    // 把連續的 <tr> 包成 <table>
    .replace(/((?:<tr[^]*?<\/tr>\s*)+)/g, (_m: string, rows: string) => {
      // 如果第一行後面緊跟 ___TABLE_SEP___，第一行是表頭
      const cleanRows = rows.replace(/___TABLE_SEP___\s*/g, '')
      const trList = cleanRows.match(/<tr[^]*?<\/tr>/g) || []
      if (trList.length === 0) return ''
      // 第一行當表頭
      const firstRow = trList[0] || ''
      const headerRow = firstRow.replace(/<td/g, '<th').replace(/<\/td>/g, '</th>').replace(/style="[^"]*"/g, 'style="padding:10px 14px;border-bottom:2px solid rgba(201,168,76,0.3);font-size:12px;font-weight:600;color:rgba(201,168,76,0.8);text-align:left;white-space:nowrap"')
      const bodyRows = trList.slice(1).join('')
      return `<div style="overflow-x:auto;margin:12px 0;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)"><table style="width:100%;border-collapse:collapse">${headerRow}${bodyRows}</table></div>`
    })
    .replace(/___TABLE_SEP___/g, '')
    .replace(/^→ 完整分析請繼續閱讀.*$/gm, '')
    // 清理所有 H1 標題（# 開頭）— 前端不顯示 H1 原始 markdown
    .replace(/^# .+$/gm, '')
    // 清理出門訣 JSON 標記（正常情況下已在後端移除，這是安全網）
    .replace(/===TOP5_JSON_START===[\s\S]*?===TOP5_JSON_END===/g, '')
    .replace(/===TOP5_JSON_START===/g, '')
    .replace(/===TOP5_JSON_END===/g, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="report-bold">$1</strong>')
    .replace(/✅/g, '<span style="color:#6ab04c">✅</span>')
    .replace(/⚠️/g, '<span style="color:#e0963a">⚠️</span>')
    .replace(/🔧/g, '<span style="color:#c9a84c">🔧</span>')
    .replace(/🟢/g, '<span style="color:#6ab04c">🟢</span>')
    .replace(/🟡/g, '<span style="color:#e0963a">🟡</span>')
    .replace(/🔵/g, '<span style="color:#5b9bd5">🔵</span>')
    .replace(/📌/g, '<span style="color:#c9a84c">📌</span>')
    // __TABLE__ 安全網：如果後處理沒清乾淨，在渲染時轉成可讀格式
    .replace(/^__TABLE__\s+(.+)$/gm, (_m: string, content: string) => {
      const parts = content.trim().split(/\s{2,}/)
      return '<div style="padding:8px 12px;margin:6px 0;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);font-size:13px;line-height:1.8">' + parts.join(' ｜ ') + '</div>'
    })
    // 引言框（> 開頭）→ 金色左邊框 callout
    .replace(/^&gt;\s*(.+)$/gm, '<blockquote style="border-left:3px solid rgba(197,150,58,0.6);padding:8px 16px;margin:12px 0;background:rgba(197,150,58,0.06);border-radius:0 8px 8px 0;font-style:normal;color:var(--color-gold);">$1</blockquote>')
    // 📌 本章重點 → 特殊樣式
    .replace(/^📌\s*(.+)$/gm, '<div style="background:rgba(197,150,58,0.08);border:1px solid rgba(197,150,58,0.2);border-radius:8px;padding:10px 14px;margin:10px 0;font-weight:600;color:var(--color-gold);font-size:0.85rem;">📌 $1</div>')
    // → 行動建議 → 突出顯示
    .replace(/^→\s*(.+)$/gm, '<div style="padding:4px 0 4px 16px;border-left:2px solid rgba(106,176,76,0.4);margin:4px 0;font-size:0.88rem;">→ $1</div>')
    .replace(/^[•·]\s*(.+)$/gm, '<li class="report-li">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="report-li">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="report-li-num">$2</li>')
    .replace(/\n\n/g, '</p><p class="report-p">')
    .replace(/\n/g, '<br/>')
  html = html.replace(/((?:<li class="report-li">.*?<\/li>\s*(?:<br\/>)?)+)/g, '<ul>$1</ul>')
  html = html.replace(/((?:<li class="report-li-num">.*?<\/li>\s*(?:<br\/>)?)+)/g, '<ol>$1</ol>')
  return html
}

// 彩色框樣式（與 PDF 對應）
const SUB_BOX_STYLES: Record<string, { bg: string; border: string; titleColor: string; icon: string }> = {
  positive:    { bg: 'rgba(106,176,76,0.07)',  border: '1.5px solid rgba(106,176,76,0.25)',  titleColor: '#6ab04c', icon: '✦' },
  caution:     { bg: 'rgba(26,42,74,0.15)',    border: '1.5px solid rgba(26,42,74,0.35)',    titleColor: '#7a9fcf', icon: '⚡' },
  improvement: { bg: 'rgba(197,150,58,0.07)',  border: '1.5px solid rgba(197,150,58,0.25)', titleColor: '#c9a84c', icon: '🔑' },
}

function classifySubSection(title: string): 'positive' | 'caution' | 'improvement' | 'general' {
  if (/好的地方|好的方面|優勢|優點|強項|祝福|相容性|🟢/.test(title)) return 'positive'
  if (/需要注意|需注意|注意的地方|注意|風險|挑戰|弱點|關係張力|🟡/.test(title)) return 'caution'
  if (/改善方案|改善建議|改善|建議|提升|行動|指南|刻意練習|🔵/.test(title)) return 'improvement'
  return 'general'
}

// 渲染單個區塊內的 markdown 為 HTML（支援 ### 子章節彩色框）
function renderSectionMarkdown(content: string): string {
  // 按 ### 分割子章節
  const subParts = content.split(/^### /m)
  if (subParts.length <= 1) {
    // 無子章節，直接渲染
    return renderInlineMarkdown(content)
      .replace(/^# (.+)$/gm, '<h3 class="report-h3">$1</h3>')
  }

  let html = ''
  // 第一塊（### 之前的引言）
  if (subParts[0].trim()) {
    html += `<p class="report-p">${renderInlineMarkdown(subParts[0].trim())}</p>`
  }

  for (let i = 1; i < subParts.length; i++) {
    const sub = subParts[i]
    const nlIdx = sub.indexOf('\n')
    const subTitle = nlIdx === -1 ? sub.trim() : sub.slice(0, nlIdx).trim()
    const subBody = nlIdx === -1 ? '' : sub.slice(nlIdx + 1).trim()
    const subType = classifySubSection(subTitle)
    const style = SUB_BOX_STYLES[subType]

    if (style && subBody) {
      // 彩色框子章節
      html += `
        <div style="background:${style.bg};border:${style.border};border-radius:8px;padding:12px 16px;margin:12px 0;">
          <div style="font-size:0.82rem;font-weight:700;color:${style.titleColor};margin-bottom:8px;letter-spacing:0.03em;">
            ${style.icon} ${subTitle}
          </div>
          <div style="font-size:0.88rem;line-height:1.7;color:var(--color-text-muted);">${renderInlineMarkdown(subBody)}</div>
        </div>`
    } else {
      // 普通子章節標題
      html += `<h3 class="report-h3" style="color:var(--color-gold);margin-top:14px;">${subTitle}</h3>`
      if (subBody) html += `<p class="report-p">${renderInlineMarkdown(subBody)}</p>`
    }
  }
  return html
}

// Google Calendar URL 生成（純前端，不需要 API key）
function buildGCalUrl(timing: Top5Timing, clientName: string): string {
  const dateStr = timing.date.replace(/-/g, '')
  const startStr = `${dateStr}T${timing.time_start.replace(':', '')}00`
  const endStr = `${dateStr}T${timing.time_end.replace(':', '')}00`
  const title = encodeURIComponent(`鑒源出門訣 - ${clientName} ${timing.title}`)
  const details = encodeURIComponent(
    `建議方位：${timing.direction}\n\n命理依據：\n${timing.reason}\n\n由鑒源命理平台 jianyuan.life 生成`
  )
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&ctz=Asia/Taipei`
}

// 排名獎牌
function getRankMedal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

// 格式化日期顯示
function formatTimingDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${y}年${Number(m)}月${Number(d)}日（${weekdays[date.getDay()]}）`
}

// 動態 OG metadata — 社群分享時顯示方案名稱與客戶名
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  )

  const { data } = await supabase
    .from('paid_reports')
    .select('client_name, plan_code')
    .eq('access_token', token)
    .single()

  const planName = data ? (PLAN_NAMES[data.plan_code] || '命理分析') : '命理分析'
  const clientName = data?.client_name || ''
  const title = clientName ? `${clientName}的${planName}報告` : `${planName}報告`
  const description = '鑒源命理 — 十五大命理系統整合分析，一份報告看清性格天賦、事業方向、感情運勢。'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: '鑒源 JianYuan',
      locale: 'zh_TW',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  )

  const { data, error } = await supabase
    .from('paid_reports')
    .select('*')
    .eq('access_token', token)
    .single()

  if (error || !data) return notFound()

  const report = data as ReportData

  // 報告生成中
  if (report.status === 'pending' || report.status === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0a0e1a 0%, #0f1628 40%, #0a0e1a 100%)' }}>
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-cream mb-2">
            {['E1','E2'].includes(report.plan_code) ? '奇門遁甲出門訣排算中'
              : report.plan_code === 'G15' ? '家族藍圖分析進行中'
              : report.plan_code === 'R' ? '關係合盤分析進行中'
              : '命理分析進行中'}
          </h1>
          <p className="text-text-muted text-sm mb-2">
            {['E1','E2'].includes(report.plan_code)
              ? '系統正以 25 層古籍評分體系逐時辰排算奇門局，套入個人年命宮驗證吉位'
              : report.plan_code === 'G15'
              ? '正在為您的家庭成員進行多人命格交叉分析，整合家族互動關係'
              : report.plan_code === 'R'
              ? '系統正為雙方分別排盤，並用七大命理系統進行合盤分析'
              : '系統正同步調用東西方十五大命理系統，逐一進行排盤運算與深度解析'}
          </p>
          <p className="text-text-muted/60 text-xs mb-1">
            {['E1','E2'].includes(report.plan_code) ? '出門訣排算通常需要 40–50 分鐘'
              : report.plan_code === 'G15' ? '家族分析通常需要 30–45 分鐘'
              : report.plan_code === 'R' ? '合盤分析通常需要 30–45 分鐘'
              : '完整分析通常需要 40–60 分鐘'}
          </p>
          <p className="text-text-muted/60 text-xs mb-6">完成後將自動寄送 Email 通知您，無需持續等候</p>
          <p className="text-gold text-sm">如需確認進度，可稍後重新整理此頁面</p>
        </div>
      </div>
    )
  }

  const aiContent = report.report_result?.ai_content || ''
  const analysesSummary = report.report_result?.analyses_summary || []
  const top5Timings = report.report_result?.top5_timings || []
  const isChumenji = ['E1', 'E2'].includes(report.plan_code)
  const isFamily = report.plan_code === 'G15'
  const isRelationship = report.plan_code === 'R'

  // 偵測是否為主題式報告（新版）
  const isThematic = isThematicReport(aiContent, report.report_result)

  // 解析命格名片（主題式報告才有）
  const personalityCard = isThematic ? parsePersonalityCard(aiContent) : null

  // R 方案：從報告內容提取合/不合結論（不使用分數，命不該有分數）
  let compatibilityVerdict = ''
  if (isRelationship && aiContent) {
    if (/你們合，但|合.*但有.*雷區/.test(aiContent)) compatibilityVerdict = '合，但有雷區'
    else if (/結論\s*[:：]\s*.*不合|你們不合/.test(aiContent)) compatibilityVerdict = '需要經營'
    else if (/結論\s*[:：]\s*.*合|你們合/.test(aiContent)) compatibilityVerdict = '互補互助'
  }

  // 報告內容完整性檢查 — 數據零容忍
  const isContentEmpty = !aiContent || aiContent.trim().length < 100

  // 結構化解析 — 保留原始章節順序
  const allSections = parseStructuredContent(aiContent)

  // 先過濾掉不該顯示的章節
  const cleanedSections = allSections.filter(sec => {
    const t = sec.title
    const c = sec.content
    // 過濾空章節（只有標題沒內容）
    if (!c || c.trim().length < 20) return false
    // 過濾 prompt 結構標籤
    if (/第一幕|第二幕|第三幕|壓軸|收尾|完整分析請繼續閱讀/.test(t)) return false
    // 過濾附錄（術語表在 PDF 看就好）
    if (/附錄|術語對照/.test(t)) return false
    // 主題式報告：命格名片已用專屬卡片渲染，從章節列表中移除
    if (personalityCard && /命格名片/.test(t)) return false
    // 過濾報告標題行
    if (/全方位命格分析報告/.test(t)) return false
    // 過濾重複的評分表（上面已有可視化圖表）
    if (/系統綜合評分|評分表|系統名稱.*評分.*關鍵發現/.test(t)) return false
    if (/15.*系統.*評分|十五.*系統.*評分/.test(t)) return false
    return true
  })

  // 網頁版只顯示客戶最關注的重點
  // 主題式報告：全部章節都是重點，不做摘要篩選
  const summarySections = isThematic ? cleanedSections : cleanedSections.filter(sec => {
    const t = sec.title
    // 一分鐘重點 / 命格名片
    if (/一分鐘|命格重點|命格名片|命格角色/.test(t)) return true
    // 命格總覽 / 你是什麼樣的人
    if (/命格總覽|你是誰|你是什麼樣的人/.test(t)) return true
    // 事業與天賦
    if (/事業與天賦|事業/.test(t)) return true
    // 財運
    if (/財運/.test(t)) return true
    // 感情與人際
    if (/感情與人際|感情/.test(t)) return true
    // 健康
    if (/健康/.test(t)) return true
    // 大運走勢
    if (/大運/.test(t)) return true
    // 流年重點
    if (/流年/.test(t)) return true
    // 年度運勢 / 月曆
    if (/年度|月曆|月運勢|行事曆|運勢行事/.test(t)) return true
    // 交叉驗證結論
    if (/交叉驗證|全局鳥瞰|十五系統/.test(t)) return true
    // 刻意練習
    if (/刻意練習/.test(t)) return true
    // 寫給你的話 / 給你的一句話
    if (/寫給|給你的/.test(t)) return true
    // 幸運元素
    if (/幸運元素/.test(t)) return true
    return false
  })

  // 出門訣專屬：把章節分為 三色分析卡片、補運指南、忌方忌日、其他
  let chumenjiAnalysis: ContentSection[] = []   // 事件吉凶分析 / 本月運勢概覽（含好的/注意/改善）
  let chumenjiGuide: ContentSection[] = []      // 補運操作指南 / 行動建議
  let chumenjiWarnings: ContentSection[] = []   // 忌方忌日 / 注意事項
  let chumenjiOther: ContentSection[] = []      // 其餘章節

  if (isChumenji) {
    for (const sec of cleanedSections) {
      const t = sec.title
      if (/事件吉凶|事件命理|本月運勢|本月命理/.test(t)) {
        chumenjiAnalysis.push(sec)
      } else if (/補運|操作指南/.test(t)) {
        chumenjiGuide.push(sec)
      } else if (/忌方|忌日|注意事項/.test(t)) {
        chumenjiWarnings.push(sec)
      } else if (/Top5|最佳出行|最佳出門/.test(t)) {
        // Top5 已有專屬卡片渲染，跳過
      } else {
        chumenjiOther.push(sec)
      }
    }
  }

  // G15 家族藍圖 / R 合否：顯示全部章節，不做摘要篩選
  // 如果篩選出的摘要太少（< 3），退回顯示全部（可能是非 C 方案）
  const sections = isChumenji ? [] : (isFamily || isRelationship) ? cleanedSections : (summarySections.length >= 3 ? summarySections : cleanedSections)
  const isShowingSummary = !isChumenji && !isFamily && !isRelationship && summarySections.length >= 3 && cleanedSections.length > summarySections.length

  // 簡體中文報告使用 SC 字體
  const isSimplified = report.birth_data?.locale === 'zh-CN'

  return (
    <div className={`min-h-screen pb-16${isSimplified ? ' locale-cn' : ''}`} style={{ background: 'linear-gradient(180deg, #0a0e1a 0%, #0f1628 40%, #0a0e1a 100%)' }}>
      <style>{`
        ${isSimplified ? `.locale-cn { font-family: var(--font-body-sc), var(--font-body), "Noto Sans SC", sans-serif; }
        .locale-cn .report-h3, .locale-cn h1, .locale-cn h2, .locale-cn h3 { font-family: var(--font-sans-sc), var(--font-sans), "Noto Serif SC", serif; }` : ''}
        .report-h3 { font-size: 1.05rem; font-weight: 600; color: var(--color-gold); margin: 1.5rem 0 0.6rem; font-family: var(--font-sans); }
        .report-bold { color: var(--color-cream); font-weight: 600; }
        .report-li { margin-left: 1.5rem; color: var(--color-text-muted); list-style: disc; margin-bottom: 0.5rem; line-height: 1.9; font-size: 0.9rem; }
        .report-li-num { margin-left: 1.5rem; color: var(--color-text-muted); list-style: decimal; margin-bottom: 0.5rem; line-height: 1.9; font-size: 0.9rem; }
        .report-p { color: var(--color-text-muted); line-height: 1.9; margin-bottom: 0.85rem; font-size: 0.9rem; }
        .section-card { border-radius: 12px; padding: 28px; margin-bottom: 24px; }
        @media print {
          body { background: white !important; color: #333 !important; }
          .no-print { display: none !important; }
          .section-card { border: 1px solid #ddd; page-break-inside: avoid; }
          .report-h3 { color: #1a2a4a; }
          .report-bold { color: #333; }
          .report-li, .report-li-num, .report-p { color: #555; }

        }
      `}</style>

      {/* 瀏覽追蹤（Client Component，不影響 SSR） */}
      <ReportTracker reportId={report.id} planCode={report.plan_code} token={token} />

      <div className="max-w-3xl mx-auto px-6 pt-12">

        {/* 品牌標題 */}
        <div className="text-center mb-3 no-print">
          <span className="text-gold/70 text-xs tracking-[4px]">鑑 源 命 理</span>
        </div>

        {/* ──── 報告頭部 ──── */}
        <div className="glass rounded-2xl p-10 mb-8 text-center">
          <div className="text-gold/60 text-xs tracking-[3px] mb-2 uppercase">
            {PLAN_NAMES[report.plan_code] || '命理分析報告'}
          </div>
          <h1 className="text-3xl font-bold text-cream mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
            {isFamily && report.birth_data?.member_names
              ? (report.birth_data.member_names as string[]).filter(Boolean).join('、') + ' 家族'
              : report.client_name}
          </h1>
          <div className="text-text-muted/40 text-xs mt-2">
            {new Date(report.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {/* R 方案專屬：相容度文字描述（不顯示分數） */}
          {isRelationship && compatibilityVerdict && (
            <div className="mt-6">
              <div
                className="inline-block px-5 py-1.5 rounded-full text-sm font-bold tracking-wider"
                style={{
                  background: 'rgba(197,150,58,0.15)',
                  color: '#c9a84c',
                  border: '1px solid rgba(197,150,58,0.3)',
                }}
              >
                {compatibilityVerdict}
              </div>
            </div>
          )}

          {/* 操作按鈕（Client Component 處理 onClick）*/}
          <ReportClientButtons pdfUrl={report.pdf_url} planCode={report.plan_code} reportId={report.id} />
        </div>

        {/* ──── 命格名片卡片（主題式報告專屬）──── */}
        {personalityCard && (
          <div className="rounded-2xl p-8 mb-8 relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(26,42,74,0.6), rgba(15,22,40,0.8))',
            border: '1px solid rgba(197,150,58,0.3)',
          }}>
            {/* 背景裝飾 */}
            <div className="absolute top-0 right-0 w-40 h-40 opacity-5" style={{
              background: 'radial-gradient(circle, rgba(197,150,58,1) 0%, transparent 70%)',
            }} />

            {/* 人格封號 */}
            <div className="text-center mb-2">
              <div className="text-gold/50 text-[10px] tracking-[4px] mb-2 uppercase">命格名片</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-wide" style={{
                color: '#c9a84c',
                fontFamily: 'var(--font-sans)',
                textShadow: '0 0 20px rgba(197,150,58,0.3)',
              }}>
                {personalityCard.title}
              </h2>
            </div>

            {/* 一句話定義 */}
            {personalityCard.definition && (
              <p className="text-center text-cream/80 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
                {personalityCard.definition}
              </p>
            )}
            {!personalityCard.definition && <div className="mb-4" />}

            {/* 關鍵字標籤 */}
            {personalityCard.keywords && personalityCard.keywords.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {personalityCard.keywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs" style={{
                    background: 'rgba(197,150,58,0.1)',
                    color: '#c9a84c',
                    border: '1px solid rgba(197,150,58,0.2)',
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* 第一印象 vs 真實的你（雙欄對比）*/}
            {personalityCard.firstImpression && personalityCard.trueself && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-text-muted/50 text-xs mb-2 tracking-wider">第一印象</div>
                  <p className="text-cream text-sm leading-relaxed">{personalityCard.firstImpression}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(197,150,58,0.06)', border: '1px solid rgba(197,150,58,0.15)' }}>
                  <div className="text-gold/60 text-xs mb-2 tracking-wider">真實的你</div>
                  <p className="text-cream text-sm leading-relaxed">{personalityCard.trueself}</p>
                </div>
              </div>
            )}

            {/* 天賦 vs 課題 標籤 */}
            {(personalityCard.talents.length > 0 || personalityCard.challenges.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* 天賦（綠色標籤）*/}
                {personalityCard.talents.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: '#6ab04c' }}>
                      <span>&#10003;</span> 天賦 Top 3
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {personalityCard.talents.map((t, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{
                          background: 'rgba(106,176,76,0.1)',
                          color: '#6ab04c',
                          border: '1px solid rgba(106,176,76,0.2)',
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* 課題（橙色標籤）*/}
                {personalityCard.challenges.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: '#e0963a' }}>
                      <span>&#9888;</span> 課題 Top 3
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {personalityCard.challenges.map((c, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{
                          background: 'rgba(224,150,58,0.1)',
                          color: '#e0963a',
                          border: '1px solid rgba(224,150,58,0.2)',
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2026 年度一句話 */}
            {personalityCard.yearTheme && (
              <div className="rounded-xl p-4 text-center" style={{
                background: 'rgba(197,150,58,0.06)',
                border: '1px solid rgba(197,150,58,0.15)',
              }}>
                <div className="text-gold/50 text-[10px] tracking-[2px] mb-1.5">2026 丙午年</div>
                <p className="text-cream text-sm leading-relaxed">{personalityCard.yearTheme}</p>
              </div>
            )}

            {/* 如果沒有結構化數據，顯示原始內容 */}
            {personalityCard.talents.length === 0 && personalityCard.challenges.length === 0 && !personalityCard.firstImpression && !personalityCard.definition && (
              <div className="report-p mt-2" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(personalityCard.rawContent) }} />
            )}
          </div>
        )}

        {/* ──── 摘要提示 + PDF 下載 ──── */}
        {isShowingSummary && report.pdf_url && (
          <div className="rounded-xl p-6 mb-8 no-print" style={{ background: 'linear-gradient(135deg, rgba(197,150,58,0.12), rgba(26,42,74,0.3))', border: '1px solid rgba(197,150,58,0.25)' }}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <div className="text-gold font-semibold mb-1">以下為報告重點摘要</div>
                <p className="text-text-muted text-sm">完整報告（含 {allSections.length} 個章節、{analysesSummary.length} 套系統逐一分析）請下載 PDF 版本</p>
              </div>
              <a href={report.pdf_url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)', color: '#0a0e1a' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下載完整 PDF 報告
              </a>
            </div>
          </div>
        )}

        {/* ──── 目錄導航 ──── */}
        {sections.length > 3 && (
          <div className="glass rounded-xl p-6 mb-8 no-print">
            <div className="text-gold/70 text-xs tracking-[2px] mb-4">{isShowingSummary ? '重點摘要目錄' : '目錄'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((sec, i) => {
                const typeIcons: Record<string, string> = { positive: '&#10003;', caution: '&#9888;', improvement: '&#9881;', general: '&#9672;' }
                return (
                  <a key={i} href={`#sec-${i}`}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-gold transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5">
                    <span className="text-xs text-gold/50" dangerouslySetInnerHTML={{ __html: typeIcons[sec.type] || '&#9672;' }} />
                    <span className="truncate">{sec.title}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}


        {/* ──── 報告不完整時不顯示任何內容，直接顯示生成中 ──── */}
        {isContentEmpty && (
          <div className="section-card text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-cream font-semibold text-lg mb-2">報告生成中</h3>
            <p className="text-text-muted text-sm">系統正在為您生成完整報告，請稍後重新整理頁面。</p>
          </div>
        )}

        {/* ──── 出門訣 E1/E2 專屬：事件吉凶分析 / 本月運勢概覽 ──── */}
        {isChumenji && chumenjiAnalysis.length > 0 && (
          <div className="mb-8">
            {chumenjiAnalysis.map((sec, i) => (
              <div key={`analysis-${i}`} className="section-card glass" style={{ borderLeft: '3px solid rgba(197,150,58,0.4)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(197,150,58,0.15)' }}>
                    {report.plan_code === 'E1' ? '⚔' : '📅'}
                  </div>
                  <h2 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
                </div>
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
              </div>
            ))}
          </div>
        )}

        {/* ──── Top5 吉時卡片（出門訣 E1/E2 專屬）──── */}
        {isChumenji && top5Timings.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: 'rgba(197,150,58,0.15)' }}>🧭</div>
              <div>
                <h2 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>
                  {report.plan_code === 'E1' ? '事件最佳出行時機' : '本月 Top5 最佳出行時機'}
                </h2>
                <p className="text-text-muted/50 text-xs mt-0.5">點擊「加入行事曆」可直接同步到 Google Calendar</p>
              </div>
            </div>

            <div className="space-y-4">
              {top5Timings.map((timing) => (
                <div
                  key={timing.rank}
                  className="section-card"
                  style={{
                    background: timing.rank === 1
                      ? 'linear-gradient(135deg, rgba(197,150,58,0.12), rgba(15,22,40,0.6))'
                      : 'rgba(255,255,255,0.03)',
                    border: timing.rank === 1
                      ? '1px solid rgba(197,150,58,0.3)'
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* 卡片頂部：排名 + 日期時間 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getRankMedal(timing.rank)}</span>
                      <div>
                        <div className="text-cream font-semibold">{timing.title}</div>
                        <div className="text-text-muted text-sm mt-0.5">
                          {formatTimingDate(timing.date)}&nbsp;&nbsp;{timing.time_start} - {timing.time_end}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-muted/50">建議方位</div>
                      <div className="text-gold font-semibold text-sm">{timing.direction}</div>
                    </div>
                  </div>

                  {/* 信心指數 + 值使門（v3.0 新增）*/}
                  {(timing.confidence || timing.zhishi_info) && (
                    <div className="flex gap-3 mb-3">
                      {timing.confidence && (() => {
                        const cleanConfidence = (timing.confidence || '').replace(/\s*\d+%/, '').trim()
                        return (
                        <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                          background: timing.confidence.includes('極高') || timing.confidence.includes('高') ? 'rgba(34,197,94,0.1)' : timing.confidence.includes('中') ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                          color: timing.confidence.includes('極高') || timing.confidence.includes('高') ? '#22c55e' : timing.confidence.includes('中') ? '#eab308' : '#ef4444',
                          border: `1px solid ${timing.confidence.includes('極高') || timing.confidence.includes('高') ? 'rgba(34,197,94,0.2)' : timing.confidence.includes('中') ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          信心指數：{cleanConfidence}
                        </div>
                        )
                      })()}
                      {timing.zhishi_info && (
                        <div className="px-3 py-1.5 rounded-lg text-xs text-blue-400" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                          {timing.zhishi_info}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 神煞警告（v3.0 新增）*/}
                  {timing.shensha_warning && (
                    <div className="mb-3 px-3 py-2 rounded-lg text-xs text-amber-400" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      ⚠ {timing.shensha_warning}
                    </div>
                  )}

                  {/* 命理依據 */}
                  <div className="mb-4 px-4 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid var(--color-gold)' }}>
                    <div className="text-text-muted/50 text-xs mb-1">命理依據</div>
                    <p className="text-text-muted text-sm leading-7">{timing.reason}</p>
                  </div>

                  {/* Google Calendar 按鈕 */}
                  <a
                    href={buildGCalUrl(timing, report.client_name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: 'rgba(197,150,58,0.15)', border: '1px solid rgba(197,150,58,0.25)', color: 'var(--color-gold)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="12" y1="14" x2="12" y2="18" />
                      <line x1="10" y1="16" x2="14" y2="16" />
                    </svg>
                    加入 Google 行事曆
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──── 出門訣 E1/E2 專屬：補運操作指南 ──── */}
        {isChumenji && chumenjiGuide.length > 0 && (
          <div className="mb-8">
            {chumenjiGuide.map((sec, i) => (
              <div key={`guide-${i}`} className="section-card" style={{ background: 'rgba(197,150,58,0.06)', border: '1px solid rgba(197,150,58,0.15)' }}>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(197,150,58,0.15)' }}>&#9788;</div>
                  <h2 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
                </div>
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
              </div>
            ))}
          </div>
        )}

        {/* ──── 出門訣 E1/E2 專屬：忌方忌日 / 注意事項 ──── */}
        {isChumenji && chumenjiWarnings.length > 0 && (
          <div className="mb-8">
            {chumenjiWarnings.map((sec, i) => (
              <div key={`warn-${i}`} className="section-card" style={{ background: 'rgba(224,150,58,0.06)', border: '1px solid rgba(224,150,58,0.15)' }}>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(224,150,58,0.15)' }}>⚡</div>
                  <h2 className="text-lg font-semibold" style={{ color: '#e0963a', fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
                </div>
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
              </div>
            ))}
          </div>
        )}

        {/* ──── 出門訣 E1/E2 專屬：其餘章節 ──── */}
        {isChumenji && chumenjiOther.map((sec, i) => (
          <div key={`other-${i}`} className="glass section-card" style={{ borderLeft: '3px solid rgba(197,150,58,0.4)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gold/40 font-mono font-bold">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
            </div>
            <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
          </div>
        ))}

        {/* ──── 報告章節（保留原始順序，依類型套用不同視覺）──── */}
        {sections.map((sec, i) => {
          // 三大核心區塊的視覺配置
          const sectionStyles: Record<string, { bg: string; border: string; iconBg: string; icon: string; titleColor: string }> = {
            positive: { bg: 'rgba(106, 176, 76, 0.06)', border: '1px solid rgba(106, 176, 76, 0.15)', iconBg: 'rgba(106, 176, 76, 0.15)', icon: '✦', titleColor: '#6ab04c' },
            caution: { bg: 'rgba(224, 150, 58, 0.06)', border: '1px solid rgba(224, 150, 58, 0.15)', iconBg: 'rgba(224, 150, 58, 0.15)', icon: '⚡', titleColor: '#e0963a' },
            improvement: { bg: 'rgba(197, 150, 58, 0.06)', border: '1px solid rgba(197, 150, 58, 0.15)', iconBg: 'rgba(197, 150, 58, 0.15)', icon: '🔑', titleColor: 'var(--color-gold)' },
          }
          const style = sectionStyles[sec.type]
          const chapterNum = i + 1

          if (style) {
            // 三大核心區塊：有圖標、有色彩背景
            return (
              <div id={`sec-${i}`} key={i} className="section-card" style={{ background: style.bg, border: style.border }}>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: style.iconBg }}>{style.icon}</div>
                  <h2 className="text-lg font-semibold" style={{ color: style.titleColor, fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
                  <span className="ml-auto text-xs opacity-30 font-mono">{chapterNum}/{sections.length}</span>
                </div>
                <div className="report-p">
                  <SectionExpander fullHtml={renderSectionMarkdown(sec.content)} sectionTitle={sec.title} />
                </div>
              </div>
            )
          }

          // 一般章節：glass card，左側金色豎條
          return (
            <div id={`sec-${i}`} key={i} className="glass section-card" style={{ borderLeft: '3px solid rgba(197,150,58,0.4)' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gold/40 font-mono font-bold">{String(chapterNum).padStart(2, '0')}</span>
                <h2 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
              </div>
              <div className="report-p">
                <SectionExpander fullHtml={renderSectionMarkdown(sec.content)} sectionTitle={sec.title} />
              </div>
            </div>
          )
        })}

        {/* ──── 出門訣推廣 ──── */}
        {!['E1', 'E2'].includes(report.plan_code) && (
          <div className="section-card no-print" style={{ background: 'linear-gradient(135deg, rgba(197,150,58,0.1), rgba(26,42,74,0.4))', border: '1px solid rgba(197,150,58,0.25)' }}>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="text-4xl shrink-0">&#9788;</div>
              <div className="flex-1">
                <div className="text-gold/60 text-[10px] tracking-[0.2em] mb-1">下一步行動</div>
                <h3 className="text-gold text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-sans)' }}>讓命理能量落地：出門訣</h3>
                <p className="text-text-muted text-sm leading-7 mb-4">
                  您的命格報告揭示了先天能量分佈，而<strong className="text-cream">出門訣</strong>是將這些能量轉化為行動的實戰工具。
                  源自《煙波釣叟歌》的千年擇吉術，系統以 25 層評分體系精算每個時辰八方位的能量——三吉門、三奇、八神、九星旺衰、天地盤干生剋、九遁格局，
                  再套入您的個人年命宮驗證。操作方法：在推薦的吉時出門，朝吉方走 500 公尺以上，到達後面朝吉方靜坐 40 分鐘接氣。
                  支援 15 種事件分類（求財、事業、感情、考試、談判、簽約等），每個推薦附帶信心指數。
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <a href="/pricing"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-dark font-bold rounded-lg text-sm btn-glow">
                    了解出門訣方案
                  </a>
                  <span className="text-xs text-text-muted/60 mt-2 sm:mt-0 sm:self-center">
                    事件出門訣 $119 / 月盤出門訣 $89
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──── 底部 PDF 按鈕（出門訣不顯示 PDF，分享已在頂部）──── */}
        {report.pdf_url && !isChumenji && (
          <div className="flex justify-center my-10">
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)', color: '#0a0e1a' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              下載 PDF 完整報告
            </a>
          </div>
        )}

        {/* ──── 客戶反饋 ──── */}
        {report.status === 'completed' && (
          <ReportFeedback
            reportId={report.id}
            planCode={report.plan_code}
            customerEmail={report.customer_email}
          />
        )}

        {/* ──── 頁尾 ──── */}
        <div className="text-center text-text-muted/30 text-xs leading-7">
          <p>&copy; 2026 鑒源命理平台 &middot; jianyuan.life</p>
          <p>此報告僅供個人參考，不構成任何法律、醫療或財務建議</p>
        </div>

      </div>
    </div>
  )
}
