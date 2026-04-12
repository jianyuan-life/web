'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function FreeTryBanner() {
  const [hasPromo, setHasPromo] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/promotions/active')
      .then(r => r.json())
      .then(d => setHasPromo(!!d.promotion))
      .catch(() => setHasPromo(false))
  }, [])

  // 載入中或有促銷活動時不顯示
  if (hasPromo === null || hasPromo) return null

  return (
    <div className="glass rounded-2xl p-4 mb-8 text-center border border-gold/10">
      <p className="text-sm text-cream mb-2">
        還在猶豫？先免費體驗八字速算，30 秒出結果
      </p>
      <Link
        href="/tools/bazi"
        className="inline-block px-5 py-2 bg-gold/10 text-gold text-sm font-semibold rounded-full border border-gold/30 hover:bg-gold/20 transition-colors"
      >
        免費體驗
      </Link>
    </div>
  )
}
