'use client'

import { useEffect, useState } from 'react'

interface ReferralData {
  code: string
  totalReferrals: number
  isActive: boolean
}

interface PointsData {
  balance: number
  totalEarned: number
  totalUsed: number
  expiringIn30Days: number
}

export default function ReferralCard() {
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [points, setPoints] = useState<PointsData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [refRes, ptsRes] = await Promise.all([
          fetch('/api/referral/my-code'),
          fetch('/api/points/balance'),
        ])
        if (refRes.ok) {
          const data = await refRes.json()
          setReferral(data)
        }
        if (ptsRes.ok) {
          const data = await ptsRes.json()
          setPoints(data)
        }
      } catch { /* 靜默失敗 */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const copyCode = () => {
    if (!referral?.code) return
    const shareUrl = `https://jianyuan.life/auth/signup?ref=${referral.code}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return null

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gold flex items-center gap-2">
        <span>&#9733;</span> 推薦朋友，雙方都獲獎勵
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 推薦碼卡片 */}
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-xs text-text-muted">您的專屬推薦碼</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gold tracking-wider">
              {referral?.code || '---'}
            </span>
            <button onClick={copyCode}
              className="text-xs px-2 py-1 bg-gold/20 text-gold rounded hover:bg-gold/30 transition-colors">
              {copied ? '已複製!' : '複製連結'}
            </button>
          </div>
          <p className="text-[11px] text-text-muted/60">
            已推薦 {referral?.totalReferrals || 0} 人
            {referral && referral.totalReferrals > 0 && <span className="text-gold ml-1">+{(referral.totalReferrals) * 10} 點</span>}
          </p>
        </div>

        {/* 點數卡片 */}
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <p className="text-xs text-text-muted">我的獎勵點數</p>
          <p className="text-lg font-bold text-gold">{points?.balance || 0} <span className="text-sm font-normal text-text-muted">點</span></p>
          <p className="text-[11px] text-text-muted/60">
            1 點 = $1，結帳時可折抵
            {points && points.expiringIn30Days > 0 && (
              <span className="text-red-400 ml-1">{points.expiringIn30Days} 點即將到期</span>
            )}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-text-muted/50 text-center">
        朋友透過您的連結註冊並首次購買，您獲得 10 點，朋友獲得 5 點
      </p>
    </div>
  )
}
