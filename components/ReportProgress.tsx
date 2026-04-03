'use client'

import { useEffect, useState } from 'react'

const SYSTEMS = [
  { name: '八字命理', icon: '☰', duration: 3 },
  { name: '紫微斗數', icon: '★', duration: 3 },
  { name: '奇門遁甲', icon: '☯', duration: 3 },
  { name: '西洋占星', icon: '♌', duration: 3 },
  { name: '吠陀占星', icon: '✦', duration: 3 },
  { name: '易經六爻', icon: '☱', duration: 3 },
  { name: '姓名學', icon: '文', duration: 3 },
  { name: '風水學', icon: '🏠', duration: 3 },
  { name: '人類圖', icon: '◈', duration: 3 },
  { name: '塔羅牌', icon: '🃏', duration: 3 },
  { name: '數字命理', icon: '∞', duration: 3 },
  { name: '古典命理', icon: '⊕', duration: 3 },
  { name: '生肖命理', icon: '🐉', duration: 3 },
  { name: '生物節律', icon: '⏱', duration: 3 },
  { name: '南洋術數', icon: '🌴', duration: 3 },
]

// 每個系統間隔約 2.5 分鐘（模擬 40 分鐘總時長）
const INTERVAL_MS = 2.5 * 60 * 1000

export default function ReportProgress({ createdAt }: { createdAt: string }) {
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    // 根據已等待時間計算已「完成」幾個系統
    const elapsed = Date.now() - new Date(createdAt).getTime()
    const done = Math.min(Math.floor(elapsed / INTERVAL_MS), SYSTEMS.length)
    setCompleted(done)

    // 每 30 秒更新一次
    const timer = setInterval(() => {
      const el = Date.now() - new Date(createdAt).getTime()
      const d = Math.min(Math.floor(el / INTERVAL_MS), SYSTEMS.length)
      setCompleted(d)
    }, 30_000)

    return () => clearInterval(timer)
  }, [createdAt])

  const pct = Math.round((completed / SYSTEMS.length) * 100)

  return (
    <div className="mt-3 space-y-2">
      {/* 進度條 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gold/70 tabular-nums w-8 text-right">{pct}%</span>
      </div>

      {/* 系統格子 */}
      <div className="flex flex-wrap gap-1.5">
        {SYSTEMS.map((s, i) => (
          <div
            key={s.name}
            title={s.name}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all duration-500 ${
              i < completed
                ? 'bg-gold/15 text-gold border border-gold/30'
                : i === completed
                ? 'bg-white/5 text-gold/50 border border-gold/10 animate-pulse'
                : 'bg-white/3 text-white/20 border border-white/5'
            }`}
          >
            <span className="text-[10px]">{s.icon}</span>
            <span>{i < completed ? '✓' : i === completed ? '...' : s.name.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        {completed < SYSTEMS.length
          ? `已完成 ${completed}/15 套系統分析，完成後自動寄送 Email`
          : 'AI 深度整合分析中，即將完成...'}
      </p>
    </div>
  )
}
