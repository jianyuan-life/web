import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

// ============================================================
// 報告閱讀頁 — 透過 access_token 讀取真實報告（無需登入）
// 全新設計：結構化三大區塊 + 評分橫條圖 + 品牌色系
// ============================================================

interface ReportData {
  id: string
  client_name: string
  plan_code: string
  amount_usd: number
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
    if (/好的地方|優勢|優點|強項/.test(title)) type = 'positive'
    else if (/需要注意|注意|風險|挑戰|弱點/.test(title)) type = 'caution'
    else if (/改善建議|建議|提升|改善|行動/.test(title)) type = 'improvement'

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
  return content
    .replace(/^### (.+)$/gm, '<h3 class="report-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="report-bold">$1</strong>')
    .replace(/✅/g, '<span style="color:#6ab04c">✅</span>')
    .replace(/⚠️/g, '<span style="color:#e0963a">⚠️</span>')
    .replace(/🔧/g, '<span style="color:#c5963a">🔧</span>')
    .replace(/^- (.+)$/gm, '<li class="report-li">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="report-li-num">$2</li>')
    .replace(/\n\n/g, '</p><p class="report-p">')
    .replace(/\n/g, '<br/>')
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
  const avgScore = analysesSummary.length > 0
    ? Math.round(analysesSummary.reduce((s, a) => s + a.score, 0) / analysesSummary.length)
    : 0

  // 結構化解析
  const sections = parseStructuredContent(aiContent)
  const positiveSections = sections.filter(s => s.type === 'positive')
  const cautionSections = sections.filter(s => s.type === 'caution')
  const improvementSections = sections.filter(s => s.type === 'improvement')
  const generalSections = sections.filter(s => s.type === 'general')

  // 排序系統評分（高到低）
  const sortedScores = [...analysesSummary].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(180deg, #1a110a 0%, #2c1810 40%, #1a110a 100%)' }}>
      <style>{`
        .report-h3 { font-size: 1rem; font-weight: 600; color: var(--color-gold); margin: 1.25rem 0 0.5rem; font-family: var(--font-sans); }
        .report-bold { color: var(--color-cream); font-weight: 600; }
        .report-li { margin-left: 1.5rem; color: var(--color-text-muted); list-style: disc; margin-bottom: 0.35rem; line-height: 1.8; }
        .report-li-num { margin-left: 1.5rem; color: var(--color-text-muted); list-style: decimal; margin-bottom: 0.35rem; line-height: 1.8; }
        .report-p { color: var(--color-text-muted); line-height: 1.8; margin-bottom: 0.75rem; }
        .section-card { border-radius: 12px; padding: 28px; margin-bottom: 20px; }
        .score-bar { height: 8px; border-radius: 4px; transition: width 0.6s ease; }
        .score-bar-bg { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06); width: 100%; }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 pt-12">

        {/* 品牌標題 */}
        <div className="text-center mb-3">
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
        </div>

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

        {/* ──── 好的地方 ──── */}
        {positiveSections.length > 0 && (
          <div className="section-card" style={{ background: 'rgba(106, 176, 76, 0.06)', border: '1px solid rgba(106, 176, 76, 0.15)' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(106, 176, 76, 0.15)' }}>✦</div>
              <h2 className="text-lg font-semibold" style={{ color: '#6ab04c', fontFamily: 'var(--font-sans)' }}>好的地方</h2>
            </div>
            {positiveSections.map((sec, i) => (
              <div key={i}>
                {positiveSections.length > 1 && (
                  <h3 className="text-sm font-semibold text-cream/80 mb-2">{sec.title}</h3>
                )}
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
              </div>
            ))}
          </div>
        )}

        {/* ──── 需要注意 ──── */}
        {cautionSections.length > 0 && (
          <div className="section-card" style={{ background: 'rgba(224, 150, 58, 0.06)', border: '1px solid rgba(224, 150, 58, 0.15)' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(224, 150, 58, 0.15)' }}>⚡</div>
              <h2 className="text-lg font-semibold" style={{ color: '#e0963a', fontFamily: 'var(--font-sans)' }}>需要注意</h2>
            </div>
            {cautionSections.map((sec, i) => (
              <div key={i}>
                {cautionSections.length > 1 && (
                  <h3 className="text-sm font-semibold text-cream/80 mb-2">{sec.title}</h3>
                )}
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
              </div>
            ))}
          </div>
        )}

        {/* ──── 改善建議 ──── */}
        {improvementSections.length > 0 && (
          <div className="section-card" style={{ background: 'rgba(197, 150, 58, 0.06)', border: '1px solid rgba(197, 150, 58, 0.15)' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(197, 150, 58, 0.15)' }}>🔑</div>
              <h2 className="text-lg font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>改善建議</h2>
            </div>
            {improvementSections.map((sec, i) => (
              <div key={i}>
                {improvementSections.length > 1 && (
                  <h3 className="text-sm font-semibold text-cream/80 mb-2">{sec.title}</h3>
                )}
                <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
              </div>
            ))}
          </div>
        )}

        {/* ──── 其他章節 section card ──── */}
        {generalSections.map((sec, i) => (
          <div key={i} className="glass section-card">
            <h2 className="text-lg font-semibold text-gold mb-4" style={{ fontFamily: 'var(--font-sans)' }}>{sec.title}</h2>
            <div className="report-p" dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(sec.content) }} />
          </div>
        ))}

        {/* ──── 出門訣推廣 ──── */}
        {!['E1', 'E2', 'E3'].includes(report.plan_code) && (
          <div className="section-card" style={{ background: 'linear-gradient(135deg, rgba(197,150,58,0.08), rgba(44,24,16,0.6))', border: '1px solid rgba(197,150,58,0.2)' }}>
            <div className="flex gap-4">
              <div className="text-3xl">🧭</div>
              <div>
                <h3 className="text-gold text-base font-semibold mb-2" style={{ fontFamily: 'var(--font-sans)' }}>讓命理能量落地：出門訣</h3>
                <p className="text-text-muted text-sm leading-7 mb-3">
                  報告揭示了您的命格能量，而<strong className="text-cream">出門訣</strong>能讓您在最佳時機、最佳方位行動，
                  將命理能量轉化為現實中的改變。這是鑑源最核心的實戰工具。
                </p>
                <a href="/pricing" className="text-gold text-sm hover:text-gold-light transition-colors">了解出門訣方案 →</a>
              </div>
            </div>
          </div>
        )}

        {/* ──── PDF 按鈕 ──── */}
        <div className="text-center my-10">
          <button
            disabled
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold cursor-not-allowed opacity-50"
            style={{ background: 'rgba(197,150,58,0.15)', border: '1px solid rgba(197,150,58,0.2)', color: 'var(--color-gold)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            PDF 報告將寄送至您的信箱
          </button>
        </div>

        {/* ──── 頁尾 ──── */}
        <div className="text-center text-text-muted/30 text-xs leading-7">
          <p>&copy; 2026 鑑源命理平台 &middot; jianyuan.life</p>
          <p>此報告僅供個人參考，不構成任何法律、醫療或財務建議</p>
        </div>

      </div>
    </div>
  )
}
