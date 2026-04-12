'use client'

import { useEffect, useState } from 'react'

export default function SocialProof() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setCount(d.count ?? 0))
      .catch(() => {})
  }, [])

  if (count <= 0) return null

  return (
    <p className="text-center text-sm text-gold/80 mb-8">
      &#9733; 已有 <span className="font-bold text-gold">{count.toLocaleString('en-US')}</span> 位用戶選擇鑒源
    </p>
  )
}
