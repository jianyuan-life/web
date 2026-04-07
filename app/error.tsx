'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-3">發生了一些問題</h1>
        <p className="text-text-muted mb-6">
          {error.message || '頁面載入時發生錯誤，請稍後再試。'}
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-gold text-dark font-bold rounded-xl btn-glow">
            重試
          </button>
          <a href="/" className="px-6 py-3 glass rounded-xl text-cream hover:bg-white/10 transition-colors">
            回到首頁
          </a>
        </div>
        <p className="mt-8 text-xs text-text-muted/50">
          如果問題持續發生，請聯繫 <a href="mailto:support@jianyuan.life" className="text-gold/70 hover:text-gold">support@jianyuan.life</a>
        </p>
      </div>
    </div>
  )
}
