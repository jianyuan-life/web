import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-gold mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">找不到此頁面</h1>
        <p className="text-text-muted mb-8">
          你要找的頁面不存在或已被移動。
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="px-6 py-3 bg-gold text-dark font-bold rounded-xl btn-glow">
            回到首頁
          </Link>
          <Link href="/pricing" className="px-6 py-3 glass rounded-xl text-cream hover:bg-white/10 transition-colors">
            瀏覽方案
          </Link>
        </div>
      </div>
    </div>
  )
}
