'use client'

import { useState } from 'react'

// 從 HTML 內容中提取重點（粗體+引言框+行動建議+emoji標記）
function extractHighlights(html: string): string {
  const lines = html.split(/(?:<br\s*\/?>|\n)+/)
  const highlights: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 保留：粗體結論
    if (trimmed.includes('<strong>') && trimmed.length < 500) {
      highlights.push(trimmed)
      continue
    }
    // 保留：引言框（blockquote）
    if (trimmed.includes('blockquote') || trimmed.includes('border-left')) {
      highlights.push(trimmed)
      continue
    }
    // 保留：行動建議（→ 開頭）
    if (trimmed.includes('→') || trimmed.includes('border-left:3px solid rgba(106,176,76')) {
      highlights.push(trimmed)
      continue
    }
    // 保留：emoji 分類標記（🟢🟡🔵📌）
    if (/🟢|🟡|🔵|📌/.test(trimmed)) {
      highlights.push(trimmed)
      continue
    }
    // 保留：章節標題（h3/h4）
    if (trimmed.includes('report-h3') || trimmed.includes('<h3') || trimmed.includes('<h4')) {
      highlights.push(trimmed)
      continue
    }
    // 保留：彩色框（好的地方/注意/改善）
    if (trimmed.includes('border-radius:12px') && trimmed.includes('border:')) {
      highlights.push(trimmed)
      continue
    }
  }

  return highlights.join('<br/>')
}

interface SectionExpanderProps {
  fullHtml: string
  sectionTitle: string
}

export default function SectionExpander({ fullHtml, sectionTitle }: SectionExpanderProps) {
  const [expanded, setExpanded] = useState(false)
  const highlightHtml = extractHighlights(fullHtml)
  const hasMore = highlightHtml.length < fullHtml.length * 0.8 // 如果提取的重點不到全文 80%，才顯示展開按鈕

  // 某些章節預設展開（短章節、寫給你的話、刻意練習）
  const alwaysExpand = /寫給|刻意練習|你的問題|你們的問題|你的答案|你們的答案/.test(sectionTitle)

  if (alwaysExpand || !hasMore) {
    return <div dangerouslySetInnerHTML={{ __html: fullHtml }} />
  }

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: expanded ? fullHtml : highlightHtml }} />
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-gold/70 hover:text-gold transition-colors flex items-center gap-1"
      >
        {expanded ? (
          <>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>&#9660;</span>
            收起詳細分析
          </>
        ) : (
          <>
            <span>&#9660;</span>
            展開完整分析（含命理佐證）
          </>
        )}
      </button>
    </div>
  )
}
