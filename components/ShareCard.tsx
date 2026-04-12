'use client'

import { useState } from 'react'

// 各方案的分享文案
const PLAN_NAMES: Record<string, string> = {
  C: '人生藍圖', D: '心之所惑',
  G15: '家族藍圖', R: '合否？',
  E1: '事件出門訣', E2: '月盤出門訣',
}

interface ShareCardProps {
  planCode: string
  clientName: string
  aiContent: string
  top5Timings?: Array<{
    rank: number
    title: string
    date: string
    time_start: string
    time_end: string
    direction: string
  }>
}

// 從 AI 內容中提取各方案的精華
function extractHighlight(planCode: string, aiContent: string, top5Timings?: ShareCardProps['top5Timings']): {
  headline: string
  subtitle: string
  detail: string
} {
  const clean = (s: string) => s.replace(/\*{1,2}/g, '').replace(/^[\d]+\.\s*/, '').trim()

  // C方案：命格封號 + 天賦Top1 + 一句話定義
  if (planCode === 'C') {
    let title = ''
    const titleMatch = aiContent.match(/(?:人格封號|命格封號|你的封號)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
    if (titleMatch) title = clean(titleMatch[1])

    let definition = ''
    const defMatch = aiContent.match(/(?:一句話定義你|一句話定義)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
    if (defMatch) definition = clean(defMatch[1])

    let talent = ''
    const talentMatch = aiContent.match(/(?:天賦|優勢|天生強項)\s*(?:Top\s*\d+)?\*{0,2}[：:]*\s*\n\s*[-\d.*]*\s*\*{0,2}(.+?)\*{0,2}/i)
    if (talentMatch) talent = clean(talentMatch[1])

    return {
      headline: title || '你的命格名片',
      subtitle: talent ? `天賦亮點：${talent}` : '',
      detail: definition || '探索你的命格密碼',
    }
  }

  // D方案：「你的答案」第一句
  if (planCode === 'D') {
    let answer = ''
    const answerMatch = aiContent.match(/(?:你的答案|核心解答|給你的解答)\*{0,2}[：:]\s*\*{0,2}(.+?)(?:\n|$)/m)
      || aiContent.match(/(?:寫給你的話|給你的一句話)\s*\n+\s*(.+?)(?:\n|$)/m)
    if (answerMatch) answer = clean(answerMatch[1])

    return {
      headline: '心之所惑',
      subtitle: '你的問題，找到了方向',
      detail: answer ? (answer.length > 60 ? answer.slice(0, 57) + '...' : answer) : '用命理智慧，解開心中疑惑',
    }
  }

  // R方案：合/不合結論
  if (planCode === 'R') {
    let conclusion = ''
    const concMatch = aiContent.match(/(?:整體結論|合盤結論|綜合結論|相合程度)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
      || aiContent.match(/(?:天作之合|相輔相成|互補成長|需要磨合)/m)
    if (concMatch) conclusion = clean(concMatch[0].includes('：') || concMatch[0].includes(':') ? concMatch[1] : concMatch[0])

    return {
      headline: '合否？',
      subtitle: conclusion || '雙人合盤分析結果',
      detail: '看看你們的命格契合度',
    }
  }

  // E1/E2：Top1 吉時方位
  if ((planCode === 'E1' || planCode === 'E2') && top5Timings && top5Timings.length > 0) {
    const best = top5Timings[0]
    return {
      headline: planCode === 'E1' ? '事件出門訣' : '月盤出門訣',
      subtitle: `最佳吉時：${best.date} ${best.time_start}-${best.time_end}`,
      detail: `吉方：${best.direction}`,
    }
  }

  // G15：家族能量描述
  if (planCode === 'G15') {
    let familyDesc = ''
    const familyMatch = aiContent.match(/(?:家族能量|家族特質|整體家族)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
    if (familyMatch) familyDesc = clean(familyMatch[1])

    return {
      headline: '家族藍圖',
      subtitle: familyDesc || '家族命格交叉分析',
      detail: '探索家族成員間的能量互動',
    }
  }

  // fallback
  return {
    headline: PLAN_NAMES[planCode] || '命理報告',
    subtitle: '你的專屬命理分析',
    detail: '探索命格密碼',
  }
}

export default function ShareCard({ planCode, clientName, aiContent, top5Timings }: ShareCardProps) {
  const [copied, setCopied] = useState(false)
  const [format, setFormat] = useState<'square' | 'story'>('square')

  const highlight = extractHighlight(planCode, aiContent, top5Timings)
  const planName = PLAN_NAMES[planCode] || '命理報告'
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  const shareText = `我在鑒源命理完成了「${planName}」分析！${highlight.headline !== planName ? `我的命格封號是「${highlight.headline}」` : ''} 來看看你的命格密碼 👉 jianyuan.life`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = currentUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareLINE = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + currentUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // 隱藏名字中間字（隱私保護）
  const maskedName = clientName.length >= 2
    ? clientName[0] + 'O'.repeat(clientName.length - 2) + clientName[clientName.length - 1]
    : clientName

  const isSquare = format === 'square'

  return (
    <div className="no-print section-card" style={{
      background: 'linear-gradient(135deg, rgba(197,150,58,0.06), rgba(15,22,40,0.4))',
      border: '1px solid rgba(197,150,58,0.15)',
      borderRadius: '16px',
      padding: '32px',
    }}>
      {/* 標題 */}
      <div className="text-center mb-6">
        <div className="text-xs tracking-widest text-gold/50 mb-2">SHARE YOUR DESTINY</div>
        <h3 className="text-lg font-semibold text-gold mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
          分享你的命格精華
        </h3>
        <p className="text-text-muted text-sm">
          截圖分享到社群，讓朋友也來探索
        </p>
      </div>

      {/* 格式切換 */}
      <div className="flex justify-center gap-2 mb-6">
        {[
          { key: 'square' as const, label: '正方形', desc: '1:1' },
          { key: 'story' as const, label: '限動', desc: '9:16' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFormat(opt.key)}
            className="text-xs px-4 py-2 rounded-full transition-all"
            style={{
              background: format === opt.key ? 'rgba(197, 150, 58, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${format === opt.key ? 'rgba(197, 150, 58, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: format === opt.key ? 'var(--color-gold)' : 'var(--color-text-muted)',
            }}
          >
            {opt.label} <span className="opacity-50">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* 卡片預覽 */}
      <div className="flex justify-center mb-6">
        <div
          style={{
            width: isSquare ? '320px' : '240px',
            height: isSquare ? '320px' : '426px',
            background: 'linear-gradient(160deg, #0a0e1a 0%, #101832 50%, #0a0e1a 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(201, 168, 76, 0.3)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: isSquare ? '28px' : '40px 24px',
          }}
        >
          {/* 裝飾元素 — 頂部金線 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          }} />

          {/* 品牌名 */}
          <div style={{
            fontSize: '10px',
            letterSpacing: '4px',
            color: 'rgba(201, 168, 76, 0.5)',
            marginBottom: isSquare ? '16px' : '24px',
          }}>
            JIANYUAN
          </div>

          {/* 方案標籤 */}
          <div style={{
            fontSize: '11px',
            padding: '4px 16px',
            borderRadius: '999px',
            border: '1px solid rgba(201, 168, 76, 0.3)',
            color: '#c9a84c',
            marginBottom: isSquare ? '16px' : '24px',
          }}>
            {planName}
          </div>

          {/* 主標題（封號 / 方案亮點） */}
          <div style={{
            fontSize: isSquare ? '22px' : '24px',
            fontWeight: 700,
            color: '#E8E4DE',
            textAlign: 'center',
            lineHeight: 1.4,
            marginBottom: '8px',
            maxWidth: '90%',
          }}>
            {highlight.headline}
          </div>

          {/* 副標題 */}
          {highlight.subtitle && (
            <div style={{
              fontSize: '12px',
              color: 'rgba(201, 168, 76, 0.8)',
              textAlign: 'center',
              marginBottom: '12px',
              maxWidth: '85%',
              lineHeight: 1.5,
            }}>
              {highlight.subtitle}
            </div>
          )}

          {/* 詳細描述 */}
          <div style={{
            fontSize: '11px',
            color: 'rgba(232, 228, 222, 0.5)',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '80%',
            marginBottom: isSquare ? '16px' : '24px',
          }}>
            {highlight.detail}
          </div>

          {/* 分隔線 */}
          <div style={{
            width: '40px',
            height: '1px',
            background: 'rgba(201, 168, 76, 0.3)',
            marginBottom: isSquare ? '12px' : '16px',
          }} />

          {/* 用戶名 */}
          <div style={{
            fontSize: '11px',
            color: 'rgba(232, 228, 222, 0.4)',
          }}>
            {maskedName} 的命格分析
          </div>

          {/* 底部裝飾金線 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          }} />

          {/* 網址浮水印 */}
          <div style={{
            position: 'absolute',
            bottom: isSquare ? '12px' : '16px',
            fontSize: '9px',
            letterSpacing: '2px',
            color: 'rgba(201, 168, 76, 0.3)',
          }}>
            jianyuan.life
          </div>
        </div>
      </div>

      {/* 提示 */}
      <p className="text-center text-xs text-text-muted/40 mb-6">
        長按或截圖保存卡片，分享到社群平台
      </p>

      {/* 分享按鈕列 */}
      <div className="flex flex-wrap justify-center gap-3">
        {/* 複製連結 */}
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
          style={{
            background: copied ? 'rgba(106, 176, 76, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${copied ? 'rgba(106, 176, 76, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            color: copied ? '#6ab04c' : 'var(--color-cream)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          {copied ? '已複製' : '複製連結'}
        </button>

        {/* LINE 分享 */}
        <button
          onClick={handleShareLINE}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
          style={{
            background: 'rgba(6, 199, 85, 0.12)',
            border: '1px solid rgba(6, 199, 85, 0.25)',
            color: '#06c755',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          LINE
        </button>

        {/* WhatsApp 分享 */}
        <button
          onClick={handleShareWhatsApp}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
          style={{
            background: 'rgba(37, 211, 102, 0.12)',
            border: '1px solid rgba(37, 211, 102, 0.25)',
            color: '#25d366',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </button>
      </div>
    </div>
  )
}
