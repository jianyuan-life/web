import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

// ============================================================
// 報告閱讀頁 — 透過 access_token 讀取真實報告（無需登入）
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

function getSystemIcon(system: string): string {
  const icons: Record<string, string> = {
    '八字': '☰', '紫微': '★', '奇門': '☯', '風水': '🏠',
    '西洋': '♌', '吠陀': '✦', '姓名': '文', '易經': '☱',
    '人類圖': '◈', '塔羅': '🃏', '數字': '∞', '古典': '⊕',
    '生肖': '🐉', '生物': '⏱', '南洋': '🌴',
  }
  for (const [key, icon] of Object.entries(icons)) {
    if (system.includes(key)) return icon
  }
  return '◆'
}

function renderMarkdown(content: string): string {
  return content
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.5rem;font-weight:700;color:#c9a84c;margin:2rem 0 1rem">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;font-weight:600;color:#ffffff;margin:1.5rem 0 0.75rem;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:0.5rem">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:500;color:#c9a84c99;margin:1rem 0 0.5rem">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ffffff;font-weight:600">$1</strong>')
    .replace(/✅/g, '<span style="color:#6ab04c">✅</span>')
    .replace(/⚠️/g, '<span style="color:#e0963a">⚠️</span>')
    .replace(/🔧/g, '<span style="color:#4a7aaa">🔧</span>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:1.5rem;color:#9ca3af;list-style:disc;margin-bottom:0.25rem">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:1.5rem;color:#9ca3af;list-style:decimal;margin-bottom:0.25rem">$2</li>')
    .replace(/\n\n/g, '</p><p style="color:#9ca3af;line-height:1.8;margin-bottom:0.75rem">')
    .replace(/\n/g, '<br/>')
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>命理分析進行中</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>系統正同步調用東西方十五大命理系統，逐一進行排盤運算與 AI 深度解析</p>
          <p style={{ color: '#4b5563', fontSize: '12px', marginBottom: '4px' }}>完整分析通常需要 40–60 分鐘</p>
          <p style={{ color: '#4b5563', fontSize: '12px', marginBottom: '24px' }}>完成後將自動寄送 Email 通知您，無需持續等候</p>
          <p style={{ color: '#c9a84c', fontSize: '13px' }}>如需確認進度，可稍後重新整理此頁面</p>
        </div>
      </div>
    )
  }

  const aiContent = report.report_result?.ai_content || ''
  const analysesSummary = report.report_result?.analyses_summary || []
  const avgScore = analysesSummary.length > 0
    ? Math.round(analysesSummary.reduce((s, a) => s + a.score, 0) / analysesSummary.length)
    : 0

  const bd = report.birth_data
  const birthStr = bd
    ? `${bd.year}年${bd.month}月${bd.day}日${bd.hour ? ` ${bd.hour}時` : ''} ｜ ${bd.gender === 'M' ? '男' : '女'}`
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', padding: '48px 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>

        {/* 品牌標題 */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#c9a84c', fontSize: '13px', letterSpacing: '4px' }}>鑑 源 命 理</span>
        </div>

        {/* 報告頭部 */}
        <div style={{ background: 'linear-gradient(135deg,#1a2a4a,#0d1a2e)', border: '1px solid #2a3a5a', borderRadius: '16px', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '2px', marginBottom: '8px' }}>
            {PLAN_NAMES[report.plan_code] || '命理分析報告'}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>{report.client_name}</h1>
          {birthStr && <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 24px 0' }}>{birthStr}</p>}

          {avgScore > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '56px', fontWeight: '800', background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {avgScore}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#9ca3af', fontSize: '13px' }}>綜合評分</div>
                <div style={{ color: '#6b7280', fontSize: '11px' }}>{analysesSummary.length} 套系統平均</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '16px', color: '#4b5563', fontSize: '11px' }}>
            生成時間：{new Date(report.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* 各系統評分 */}
        {analysesSummary.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '2px', marginBottom: '16px' }}>各系統評分</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {analysesSummary.map((a) => (
                <div key={a.system} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{getSystemIcon(a.system)}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{a.score}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{a.system.replace('命理', '').replace('斗數', '').slice(0, 4)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 報告正文 */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px', marginBottom: '24px' }}>
          <p style={{ color: '#9ca3af', lineHeight: '1.8', marginBottom: '0.75rem' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(aiContent) }}
          />
        </div>

        {/* 出門訣推廣 */}
        {!['E1', 'E2', 'E3'].includes(report.plan_code) && (
          <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#0d0d1a)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ fontSize: '28px' }}>🧭</div>
              <div>
                <h3 style={{ color: '#c9a84c', fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0' }}>讓命理能量落地：出門訣</h3>
                <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.7', margin: '0 0 12px 0' }}>
                  報告揭示了您的命格能量，而<strong style={{ color: '#e5e7eb' }}>出門訣</strong>能讓您在最佳時機、最佳方位行動，
                  將命理能量轉化為現實中的改變。這是鑑源最核心的實戰工具。
                </p>
                <a href="/pricing" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none' }}>了解出門訣方案 →</a>
              </div>
            </div>
          </div>
        )}

        {/* 頁尾 */}
        <div style={{ textAlign: 'center', color: '#374151', fontSize: '12px', lineHeight: '1.8' }}>
          <p>© 2026 鑑源命理平台 · jianyuan.life</p>
          <p>此報告僅供個人參考，不構成任何法律、醫療或財務建議</p>
        </div>

      </div>
    </div>
  )
}
