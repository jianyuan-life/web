'use client'
import { useState } from 'react'

export default function ReportClientButtons({ pdfUrl, planCode }: { pdfUrl: string | null; planCode?: string }) {
  const [shareLabel, setShareLabel] = useState('分享報告')
  const isChumenji = planCode === 'E1' || planCode === 'E2'

  const handleShare = async () => {
    const url = window.location.href
    // Web Share API（iOS/Android 原生分享選單）
    if (navigator.share) {
      try {
        await navigator.share({ title: '鑒源命理報告', text: '我的命理分析報告，分享給你看看', url })
        return
      } catch {
        // 使用者取消或不支援，fallback 到複製
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url)
      setShareLabel('✓ 連結已複製！')
      setTimeout(() => setShareLabel('分享報告'), 2500)
    } catch {
      // 最後手段：提示手動複製
      window.prompt('複製此連結分享給家人（無需登入即可查看）：', url)
    }
  }

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {pdfUrl && !isChumenji && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)', color: '#0a0e1a' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          下載 PDF 完整報告
        </a>
      )}
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: 'rgba(197,150,58,0.15)', border: '1px solid rgba(197,150,58,0.25)', color: 'var(--color-gold)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        {shareLabel}
      </button>
    </div>
  )
}
