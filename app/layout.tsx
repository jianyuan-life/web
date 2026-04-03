import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import LocaleContent from '@/components/LocaleContent'
import Tracker from '@/components/Tracker'
import './globals.css'

export const metadata: Metadata = {
  title: '鑒源 JianYuan — 回到源頭，看清本質',
  description: '鑒源命理融合東西方十五大命理系統與 AI 精準分析，以金之精準、水之智慧，為您揭示命格的本質。',
  keywords: '鑒源, JianYuan, 八字算命, 紫微斗數, 奇門遁甲, 命理分析, 命格分析',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Tracker />
        <LocaleContent>
        <Navbar />
        <main className="pt-16">{children}</main>
        </LocaleContent>
        <footer className="border-t border-gold/10 mt-20">
          <div className="max-w-6xl mx-auto px-6 py-16">
            {/* 古典分隔裝飾 */}
            <div className="text-center mb-10">
              <img src="/logo.svg" alt="鑒源" className="h-10 mx-auto mb-2" />
              <p className="text-sm text-text-muted">回到源頭 &middot; 看清本質</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              <div>
                <h4 className="text-gold/80 font-semibold mb-3">命理服務</h4>
                <div className="space-y-2 text-text-muted">
                  <a href="/tools/bazi" className="block hover:text-gold transition-colors">免費命理速算</a>
                  <a href="/pricing" className="block hover:text-gold transition-colors">方案與定價</a>
                </div>
              </div>
              <div>
                <h4 className="text-gold/80 font-semibold mb-3">系統介紹</h4>
                <div className="space-y-2 text-text-muted">
                  <a href="/#systems" className="block hover:text-gold transition-colors">十五大系統</a>
                  <a href="/#how" className="block hover:text-gold transition-colors">分析流程</a>
                </div>
              </div>
              <div>
                <h4 className="text-gold/80 font-semibold mb-3">法律條款</h4>
                <div className="space-y-2 text-text-muted">
                  <a href="/privacy" className="block hover:text-gold transition-colors">隱私政策</a>
                  <a href="/terms" className="block hover:text-gold transition-colors">使用條款</a>
                </div>
              </div>
              <div>
                <h4 className="text-gold/80 font-semibold mb-3">聯繫我們</h4>
                <a href="mailto:support@jianyuan.life" className="text-text-muted hover:text-gold transition-colors">support@jianyuan.life</a>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gold/5 text-center text-xs text-text-muted/60">
              <p>本服務融合傳統命理學與人工智能技術，分析結果僅供參考，不構成任何醫療、投資或法律建議。</p>
              <p className="mt-2">&copy; {new Date().getFullYear()} 鑒源 JianYuan. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
