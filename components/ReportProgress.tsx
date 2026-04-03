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
  { name: '風水學',   icon: '🏠' },
  { name: '人類圖',   icon: '◈' },
  { name: '塔羅牌',   icon: '🃏' },
  { name: '數字命理', icon: '∞' },
  { name: '古典命理', icon: '⊕' },
  { name: '生肖命理', icon: '🐉' },
  { name: '生物節律', icon: '⏱' },
  { name: '南洋術數', icon: '🌴' },
]

// 各方案使用的系統（A方案=3個核心系統）
const PLAN_SYSTEMS: Record<string, number> = {
  C: 15, A: 3, D: 15,
  G15: 15, G3: 3, R: 15,
  M: 14, Y: 14,
  E1: 1, E2: 1, E3: 1,
}

export default function ReportProgress({ createdAt, planCode }: { createdAt: string; planCode: string }) {
  const [completed, setCompleted] = useState(0)

  const count = PLAN_SYSTEMS[planCode] ?? 15
  const systems = ALL_SYSTEMS.slice(0, count)
  // 總時長根據系統數等比，基準 15 套 = 40 分鐘
  const totalMs = (count / 15) * 40 * 60 * 1000
  const intervalMs = totalMs / count

  useEffect(() => {
    const calc = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      return Math.min(Math.floor(elapsed / intervalMs), count)
    }
    setCompleted(calc())
    const timer = setInterval(() => setCompleted(calc()), 30_000)
    return () => clearInterval(timer)
  }, [createdAt, intervalMs, count])

  const pct = Math.round((completed / count) * 100)

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gold/70 tabular-nums w-8 text-right">{pct}%</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {systems.map((s, i) => (
          <div key={s.name} title={s.name}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-500 ${
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

      <p className="text-xs text-text-muted">
        {completed < count
          ? `已完成 ${completed}/${count} 套系統分析，完成後自動寄送 Email`
          : 'AI 深度整合分析中，即將完成...'}
      </p>
    </div>
  )
}
