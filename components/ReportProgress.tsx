'use client'

import { useEffect, useState } from 'react'

const ALL_SYSTEMS = [
  { name: '八字命理', icon: '☰' },
  { name: '紫微斗數', icon: '★' },
  { name: '奇門遁甲', icon: '☯' },
  { name: '西洋占星', icon: '♌' },
  { name: '吠陀占星', icon: '✦' },
  { name: '易經六爻', icon: '☱' },
  { name: '姓名學',   icon: '文' },
  { name: '風水學',   icon: '宅' },
  { name: '人類圖',   icon: '◈' },
  { name: '塔羅牌',   icon: '牌' },
  { name: '數字命理', icon: '∞' },
  { name: '古典命理', icon: '⊕' },
  { name: '生肖命理', icon: '肖' },
  { name: '生物節律', icon: '律' },
  { name: '南洋術數', icon: '術' },
]

// 各方案使用系統數 + 預估總分鐘數
const PLAN_CONFIG: Record<string, { systems: number; totalMinutes: number; label: string }> = {
  C:   { systems: 15, totalMinutes: 30, label: '全方位命理分析' },
  D:   { systems: 15, totalMinutes: 30, label: '深度主題分析' },
  G15: { systems: 15, totalMinutes: 45, label: '家族命理分析' },
  R:   { systems: 15, totalMinutes: 35, label: '合盤關係分析' },
  E1:  { systems: 1,  totalMinutes: 40, label: '事件出門訣排算' },
  E2:  { systems: 1,  totalMinutes: 45, label: '月盤 360 時辰排算' },
}

// 分析階段定義
const PHASES = [
  { label: '排盤運算',   desc: '調取東西方命理系統，逐一起盤推算' },
  { label: '命理解析',   desc: '分析命格結構、五行格局、關鍵節點' },
  { label: 'AI 深度分析', desc: 'AI 模型交叉驗證，撰寫個人化解讀' },
  { label: '整合報告',   desc: '彙整所有系統結論，生成完整報告' },
]

function getPhaseIndex(pct: number) {
  if (pct < 25) return 0
  if (pct < 55) return 1
  if (pct < 85) return 2
  return 3
}

export default function ReportProgress({ createdAt, planCode }: { createdAt: string; planCode: string }) {
  const [pct, setPct] = useState(0)
  const [completed, setCompleted] = useState(0)

  const cfg = PLAN_CONFIG[planCode] ?? PLAN_CONFIG['C']
  const systems = ALL_SYSTEMS.slice(0, cfg.systems)
  const totalMs = cfg.totalMinutes * 60 * 1000

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      const rawPct = Math.min(Math.round((elapsed / totalMs) * 100), 97) // 最多到97%，完成才100%
      setPct(rawPct)
      setCompleted(Math.min(Math.floor((rawPct / 100) * cfg.systems), cfg.systems - 1))
    }
    update()
    const timer = setInterval(update, 15_000)
    return () => clearInterval(timer)
  }, [createdAt, totalMs, cfg.systems])

  const phaseIdx = getPhaseIndex(pct)
  const phase = PHASES[phaseIdx]
  const elapsedMin = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
  const remainMin = Math.max(cfg.totalMinutes - elapsedMin, 1)

  return (
    <div className="mt-4 space-y-4">

      {/* 階段指示器 */}
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-1.5 flex-1 ${i <= phaseIdx ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-700 ${
                i < phaseIdx ? 'bg-gold text-dark' :
                i === phaseIdx ? 'bg-gold/20 border border-gold text-gold animate-pulse' :
                'bg-white/5 border border-white/10 text-white/30'
              }`}>
                {i < phaseIdx ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] hidden sm:block ${i === phaseIdx ? 'text-gold' : i < phaseIdx ? 'text-gold/60' : 'text-white/20'}`}>
                {p.label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div className={`h-px w-3 mx-1 flex-shrink-0 ${i < phaseIdx ? 'bg-gold/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* 進度條 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gold/80 font-medium">{phase.desc}</span>
          <span className="text-gold tabular-nums font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-[2000ms] ease-out relative overflow-hidden"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #8b6914 0%, #c9a84c 50%, #e8c97a 100%)',
            }}
          >
            {/* 閃光動畫 */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', animation: 'shimmer 2s infinite' }} />
          </div>
        </div>
      </div>

      {/* 系統格子（出門訣方案不顯示） */}
      {cfg.systems > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {systems.map((s, i) => (
            <div key={s.name} title={s.name}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-700 ${
                i < completed
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : i === completed
                  ? 'bg-white/5 text-gold/50 border border-gold/10 animate-pulse'
                  : 'bg-white/3 text-white/20 border border-white/5'
              }`}>
              <span className="text-[10px]">{s.icon}</span>
              <span>{i < completed ? '✓' : i === completed ? '...' : s.name.slice(0, 2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 底部狀態說明 */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
        <div className="flex items-center gap-2 text-text-muted">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span>
            {planCode === 'E2'
              ? `正在排算 360 個時辰奇門局，套入命格驗證吉位`
              : planCode === 'E1'
              ? `正在排算事件前後所有時辰，交叉驗證命格吉位`
              : `正在同步分析 ${cfg.systems} 套命理系統`}
          </span>
        </div>
        <span className="text-white/30 tabular-nums">
          {elapsedMin < cfg.totalMinutes ? `預計剩餘 ${remainMin} 分鐘` : '即將完成'}
        </span>
      </div>
    </div>
  )
}
