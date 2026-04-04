import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ReportClientButtons from './ReportClientButtons'
import ReportCopyButton from './ReportCopyButton'

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
}

interface ReportData {
  id: string
  client_name: string
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

function parseStructuredContent(markdown: string): ContentSection[] {
  const sections: ContentSection[] = []
  // 用 ## 標題拆分區塊
  const parts = markdown.split(/^## /gm).filter(Boolean)

  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue
    const title = part.slice(0, newlineIdx).trim()
    const content = part.slice(newlineIdx + 1).trim()
    if (!content) continue

    let type: ContentSection['type'] = 'general'
    // 精確匹配三大核心區塊，避免把「最佳行動時機」「寫給你的建議」等誤判
    if (/好的地方|天賦優勢|你的優勢|你的強項|這個家的祝福/.test(title)) type = 'positive'
    else if (/需要注意|需要留意|注意的地方|家庭和諧的挑戰/.test(title)) type = 'caution'
    else if (/改善方案|改善建議|行動指南|加持你的運勢|讓家更好/.test(title)) type = 'improvement'

    sections.push({ type, title, content })
  }

  // 如果沒有用 ## 分段，整份內容作為 general
  if (sections.length === 0 && markdown.trim()) {
    sections.push({ type: 'general', title: '分析報告', content: markdown.trim() })
  }

  return sections
}

// 渲染單個區塊內的 markdown 為 HTML
function renderSectionMarkdown(content: string): string {
  let html = content
    // 標題層次
    .replace(/^### (.+)$/gm, '<h3 class="report-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h3 class="report-h3">$1</h3>')
    // 粗體
    .replace(/\*\*(.+?)\*\*/g, '<strong class="report-bold">$1</strong>')
    // 表情符號上色
    .replace(/✅/g, '<span style="color:#6ab04c">✅</span>')
    .replace(/⚠️/g, '<span style="color:#e0963a">⚠️</span>')
    .replace(/🔧/g, '<span style="color:#c5963a">🔧</span>')
    // 列表項
    .replace(/^- (.+)$/gm, '<li class="report-li">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="report-li-num">$2</li>')
    // 段落分隔
    .replace(/\n\n/g, '</p><p class="report-p">')
    .replace(/\n/g, '<br/>')

  // 將連續的 <li> 包裹在 <ul>/<ol> 中，確保語義正確
  html = html.replace(/((?:<li class="report-li">.*?<\/li>\s*(?:<br\/>)?)+)/g, '<ul>$1</ul>')
  html = html.replace(/((?:<li class="report-li-num">.*?<\/li>\s*(?:<br\/>)?)+)/g, '<ol>$1</ol>')

  return html
}

// 評分等級色彩
function getScoreColor(score: number): string {
  if (score >= 85) return '#6ab04c'  // 綠色 - 優秀
  if (score >= 75) return '#c5963a'  // 金色 - 良好
  if (score >= 65) return '#e0963a'  // 橙色 - 普通
  return '#c44a3f'                    // 紅色 - 需注意
}

function getScoreLabel(score: number): string {
  if (score >= 85) return '優秀'
  if (score >= 75) return '良好'
  if (score >= 65) return '普通'
  return '需注意'
}

// Google Calendar URL 生成（純前端，不需要 API key）
function buildGCalUrl(timing: Top5Timing, clientName: string): string {
  const dateStr = timing.date.replace(/-/g, '')
  const startStr = `${dateStr}T${timing.time_start.replace(':', '')}00`
  const endStr = `${dateStr}T${timing.time_end.replace(':', '')}00`
  const title = encodeURIComponent(`鑑源出門訣 - ${clientName} ${timing.title}`)
  const details = encodeURIComponent(
    `建議方位：${timing.direction}\n\n命理依據：\n${timing.reason}\n\n由鑑源命理平台 jianyuan.life 生成`
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
  if (report.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a110a 0%, #2c1810 40%, #1a110a 100%)' }}>
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-cream mb-2">命理分析進行中</h1>
          <p className="text-text-muted text-sm mb-2">系統正同步調用東西方十五大命理系統，逐一進行排盤運算與 AI 深度解析</p>
          <p className="text-text-muted/60 text-xs mb-1">完整分析通常需要 40–60 分鐘</p>
          <p className="text-text-muted/60 text-xs mb-6">完成後將自動寄送 Email 通知您，無需持續等候</p>
          <p className="text-gold text-sm">如需確認進度，可稍後重新整理此頁面</p>
        </div>
      </div>
    )
  }

  const aiContent = report.report_result?.ai_content || ''
  const analysesSummary = report.report_result?.analyses_summary || []
  const top5Timings = report.report_result?.top5_timings || []
  const avgScore = analysesSummary.length > 0
    ? Math.round(analysesSummary.reduce((s, a) => s + a.score, 0) / analysesSummary.length)
    : 0
  const isChumenji = ['E1', 'E2'].includes(report.plan_code)

  // 報告內容完整性檢查 — 數據零容忍
  const isContentEmpty = !aiContent || aiContent.trim().length < 100
  const isContentTruncated = aiContent.length > 500 && !aiContent.includes('寫給你的話') && !aiContent.includes('寫給你們的話') && !aiContent.includes('寫給這個家')

  // 結構化解析 — 保留原始章節順序，各章節依類型套用不同視覺
  const sections = parseStructuredContent(aiContent)

  // 排序系統評分（高到低）
  const sortedScores = [...analysesSummary].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(180deg, #1a110a 0%, #2c1810 40%, #1a110a 100%)' }}>
      <style>{`
        .report-h3 { font-size: 1.05rem; font-weight: 600; color: var(--color-gold); margin: 1.5rem 0 0.6rem; font-family: var(--font-sans); }
        .report-bold { color: var(--color-cream); font-weight: 600; }
        .report-li { margin-left: 1.5rem; color: var(--color-text-muted); list-style: disc; margin-bottom: 0.5rem; line-height: 1.9; font-size: 0.9rem; }
        .report-li-num { margin-left: 1.5rem; color: var(--color-text-muted); list-style: decimal; margin-bottom: 0.5rem; line-height: 1.9; font-size: 0.9rem; }
        .report-p { color: var(--color-text-muted); line-height: 1.9; margin-bottom: 0.85rem; font-size: 0.9rem; }
        .section-card { border-radius: 12px; padding: 28px; margin-bottom: 24px; }
        .score-bar { height: 8px; border-radius: 4px; transition: width 0.6s ease; }
        .score-bar-bg { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06); width: 100%; }
        @media print {
          body { background: white !important; color: #333 !important; }
          .no-print { display: none !important; }
          .section-card { border: 1px solid #ddd; page-break-inside: avoid; }
          .report-h3 { color: #1a2a4a; }
          .report-bold { color: #333; }
          .report-li, .report-li-num, .report-p { color: #555; }
          .score-bar-bg { background: #eee; }
        }
      `}</style>

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
            {report.client_name}
          </h1>
          <div className="text-text-muted/40 text-xs mt-2">
            {new Date(report.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {avgScore > 0 && (
            <div className="mt-8 inline-flex items-center gap-4">
              <div className="text-6xl font-extrabold text-gradient-gold">{avgScore}</div>
              <div className="text-left">
                <div className="text-text-muted text-sm">綜合評分</div>
                <div className="text-text-muted/50 text-xs">{analysesSummary.length} 套系統平均</div>
              </div>
            </div>
          )}

          {/* 操作按鈕（Client Component 處理 onClick）*/}
          <ReportClientButtons pdfUrl={report.pdf_url} />
        </div>

        {/* ──── 快速目錄（超過 5 個章節才顯示）──── */}
        {sections.length > 5 && (
          <div className="glass rounded-xl p-5 mb-6">
            <div className="text-gold/60 text-xs tracking-[2px] mb-3">報告目錄</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {sections.map((sec, i) => (
                <a
                  key={i}
                  href={`#sec-${i}`}
                  className="text-xs text-text-muted hover:text-gold transition-colors py-1 px-2 rounded hover:bg-gold/5 truncate"
                >
                  {i + 1}. {sec.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ──── 目錄導航 ──── */}
        {sections.length > 3 && (
          <div className="glass rounded-xl p-6 mb-8 no-print">
            <div className="text-gold/70 text-xs tracking-[2px] mb-4">目錄</div>
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

        {/* ──── 各系統評分橫條圖 ──── */}
        {sortedScores.length > 0 && (
          <div className="glass rounded-xl p-7 mb-8">
            <div className="text-gold/70 text-xs tracking-[2px] mb-5">各系統評分</div>
            <div className="space-y-4">
              {sortedScores.map((a) => {
                const color = getScoreColor(a.score)
                const label = getScoreLabel(a.score)
                const shortName = a.system.replace('命理', '').replace('斗數', '').replace('占星', '')
                return (
                  <div key={a.system}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-cream/90 text-sm">{shortName}</span>
                      <span className="text-xs font-semibold" style={{ color }}>
                        {a.score} <span className="text-text-muted/50 font-normal ml-1">{label}</span>
                      </span>
                    </div>
                    <div className="score-bar-bg">
                      <div className="score-bar" style={{ width: `${a.score}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ──── 內容完整性警告 ──── */}
        {isContentEmpty && (
          <div className="section-card" style={{ background: 'rgba(196, 74, 63, 0.08)', border: '1px solid rgba(196, 74, 63, 0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠</div>
              <div>
                <h3 className="text-cream font-semibold mb-1">報告內容異常</h3>
                <p className="text-text-muted text-sm">系統偵測到報告內容可能不完整，我們已收到通知並將盡快為您重新生成。如有疑問請聯繫 <a href="mailto:support@jianyuan.life" className="text-gold">support@jianyuan.life</a></p>
              </div>
            </div>
          </div>
        )}

        {isContentTruncated && !isContentEmpty && (
          <div className="section-card" style={{ background: 'rgba(224, 150, 58, 0.06)', border: '1px solid rgba(224, 150, 58, 0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="text-xl">📋</div>
              <p className="text-text-muted text-sm">報告可能尚未完全生成完畢。如內容不完整，請稍後重新整理頁面，或聯繫 <a href="mailto:support@jianyuan.life" className="text-gold">support@jianyuan.life</a></p>
            </div>
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
                      ? 'linear-gradient(135deg, rgba(197,150,58,0.12), rgba(44,24,16,0.6))'
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
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
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
              <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
            </div>
          )
        })}

        {/* ──── 出門訣推廣 ──── */}
        {!['E1', 'E2', 'E3'].includes(report.plan_code) && (
          <div className="section-card no-print" style={{ background: 'linear-gradient(135deg, rgba(197,150,58,0.1), rgba(26,42,74,0.4))', border: '1px solid rgba(197,150,58,0.25)' }}>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="text-4xl shrink-0">&#9788;</div>
              <div className="flex-1">
                <div className="text-gold/60 text-[10px] tracking-[0.2em] mb-1">下一步行動</div>
                <h3 className="text-gold text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-sans)' }}>讓命理能量落地：出門訣</h3>
                <p className="text-text-muted text-sm leading-7 mb-4">
                  您的命格報告揭示了先天能量分佈，而<strong className="text-cream">出門訣</strong>是將這些能量轉化為行動的實戰工具。
                  系統根據奇門遁甲精確排算數百個時辰，套入您的個人命格驗證，找出最適合出行的吉時與方位——
                  每次約 70 分鐘，效果可持續整個月。
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

        {/* ──── 底部操作按鈕 ──── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-10 no-print">
          {report.pdf_url ? (
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)', color: '#1a110a' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              下載 PDF 完整報告
            </a>
          ) : (
            <div className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold opacity-50"
              style={{ background: 'rgba(197,150,58,0.15)', border: '1px solid rgba(197,150,58,0.2)', color: 'var(--color-gold)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              PDF 報告將寄送至您的信箱
            </div>
          )}
          <ReportCopyButton />
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var btn = document.querySelector('[data-copy-url]');
            if(btn) btn.addEventListener('click', function(){
              navigator.clipboard.writeText(window.location.href).then(function(){
                btn.textContent = '✓ 已複製！';
                setTimeout(function(){ btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> 複製報告連結'; }, 2000);
              });
            });
          })();
        ` }} />

        {/* ──── 頁尾 ──── */}
        <div className="text-center text-text-muted/30 text-xs leading-7">
          <p>&copy; 2026 鑑源命理平台 &middot; jianyuan.life</p>
          <p>此報告僅供個人參考，不構成任何法律、醫療或財務建議</p>
        </div>

      </div>
    </div>
  )
}
