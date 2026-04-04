'use client'

export default function ReportClientButtons({ pdfUrl }: { pdfUrl: string | null }) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3 no-print">
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #e8c87a)',
            color: '#1a110a',
          }}
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
        onClick={() => {
          navigator.clipboard.writeText(window.location.href).then(() => alert('報告連結已複製'))
        }}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: 'rgba(197,150,58,0.15)', border: '1px solid rgba(197,150,58,0.25)', color: 'var(--color-gold)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        分享報告
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-muted)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
        </svg>
        列印
      </button>
    </div>
  )
}
