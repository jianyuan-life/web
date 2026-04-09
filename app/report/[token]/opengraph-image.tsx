// ============================================================
// 報告頁 OG 分享圖 — 動態生成 1200x630 品牌圖片
// Next.js App Router 檔案慣例：自動綁定 og:image
// ============================================================

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = '鑒源命理分析報告'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PLAN_NAMES: Record<string, string> = {
  C: '人生藍圖', D: '心之所惑',
  G15: '家族藍圖', R: '合否？',
  E1: '事件出門訣', E2: '月盤出門訣',
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  C: '十五大命理系統 · 完整命格分析',
  D: '針對困惑 · 精準解答',
  G15: '家族命格互動 · 深度剖析',
  R: '雙人合盤 · 關係解讀',
  E1: '奇門遁甲 · 事件最佳時機',
  E2: '奇門遁甲 · 月度吉時吉方',
}

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // 預設值（若查詢失敗）
  let clientName = ''
  let planCode = 'C'
  let score = 0

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    )

    const { data } = await supabase
      .from('paid_reports')
      .select('client_name, plan_code, report_result')
      .eq('access_token', token)
      .single()

    if (data) {
      clientName = data.client_name || ''
      planCode = data.plan_code || 'C'
      const analyses = data.report_result?.analyses_summary as { score: number }[] | undefined
      if (analyses && analyses.length > 0) {
        score = Math.round(analyses.reduce((s: number, a: { score: number }) => s + a.score, 0) / analyses.length)
      }
    }
  } catch {
    // 查詢失敗時使用預設值
  }

  const planName = PLAN_NAMES[planCode] || '命理分析'
  const planDesc = PLAN_DESCRIPTIONS[planCode] || '十五大命理系統精準分析'
  const isChumenji = ['E1', 'E2'].includes(planCode)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a1628 0%, #0f1e3d 50%, #0a1628 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景裝飾圓 */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,168,83,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* 頂部品牌名 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              color: '#d4a853',
              letterSpacing: '0.15em',
              fontWeight: 600,
            }}
          >
            鑒源命理
          </div>
          <div
            style={{
              fontSize: '18px',
              color: 'rgba(212,168,83,0.6)',
              letterSpacing: '0.1em',
            }}
          >
            JIANYUAN
          </div>
        </div>

        {/* 金色分隔線 */}
        <div
          style={{
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #d4a853, transparent)',
            marginBottom: '32px',
            display: 'flex',
          }}
        />

        {/* 方案名稱（大標題） */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.08em',
            marginBottom: '16px',
          }}
        >
          {planName}
        </div>

        {/* 方案描述 */}
        <div
          style={{
            fontSize: '22px',
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.05em',
            marginBottom: '36px',
          }}
        >
          {planDesc}
        </div>

        {/* 客戶名字（如有） + 評分（非出門訣） */}
        {(clientName || (score > 0 && !isChumenji)) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              padding: '16px 40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(212,168,83,0.2)',
            }}
          >
            {clientName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>
                  為
                </div>
                <div style={{ fontSize: '24px', color: '#d4a853', fontWeight: 600 }}>
                  {clientName}
                </div>
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>
                  專屬分析
                </div>
              </div>
            )}
            {score > 0 && !isChumenji && clientName && (
              <div
                style={{
                  width: '1px',
                  height: '28px',
                  background: 'rgba(212,168,83,0.3)',
                  display: 'flex',
                }}
              />
            )}
            {score > 0 && !isChumenji && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>
                  綜合評分
                </div>
                <div style={{ fontSize: '28px', color: '#d4a853', fontWeight: 700 }}>
                  {score}
                </div>
                <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>
                  / 100
                </div>
              </div>
            )}
          </div>
        )}

        {/* 底部網址 */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              color: 'rgba(212,168,83,0.5)',
              letterSpacing: '0.1em',
            }}
          >
            jianyuan.life
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
