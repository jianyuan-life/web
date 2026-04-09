import type { Metadata } from 'next'
import { Noto_Serif_TC, Noto_Sans_TC, Noto_Serif_SC, Noto_Sans_SC } from 'next/font/google'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import LocaleContent from '@/components/LocaleContent'
import Tracker from '@/components/Tracker'
import './globals.css'

const notoSerif = Noto_Serif_TC({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' })
const notoSans = Noto_Sans_TC({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body', display: 'swap' })
// 簡體中文字體（簡體模式時由 LocaleContent 切換 class）
const notoSerifSC = Noto_Serif_SC({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans-sc', display: 'swap' })
const notoSansSC = Noto_Sans_SC({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body-sc', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: '鑒源 JianYuan — 十五大命理系統精準分析',
    template: '%s | 鑒源 JianYuan',
  },
  description: '鑒源整合八字、紫微斗數、奇門遁甲、西洋占星等十五大命理系統，結合 34,458 條古籍規則深度分析，為您提供性格天賦、事業財運、感情婚姻的完整命格報告。',
  keywords: '鑒源, JianYuan, 八字, 紫微斗數, 奇門遁甲, 西洋占星, 命理分析, 命格分析, 命盤, 算命, 姓名學, 風水, 出門訣, 人類圖, 吠陀占星, 運勢',
  metadataBase: new URL('https://jianyuan.life'),
  openGraph: {
    title: '鑒源 JianYuan — 十五大命理系統精準分析',
    description: '整合東西方十五大命理系統，一份報告看清性格天賦、事業方向、感情運勢。免費體驗，不需註冊。',
    url: 'https://jianyuan.life',
    siteName: '鑒源 JianYuan',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: '鑒源 JianYuan — 十五大命理系統精準分析',
    description: '整合東西方十五大命理系統，一份報告看清性格天賦、事業方向、感情運勢。',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://jianyuan.life',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={`${notoSerif.variable} ${notoSans.variable} ${notoSerifSC.variable} ${notoSansSC.variable}`}>
      <head>
        {/* Google Analytics 4 */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '鑒源 JianYuan',
              url: 'https://jianyuan.life',
              description: '整合東西方十五大命理系統精準交叉驗證的命格分析平台',
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '39',
                highPrice: '269',
                priceCurrency: 'USD',
                offerCount: '6',
              },
              creator: {
                '@type': 'Organization',
                name: '鑒源 JianYuan',
                url: 'https://jianyuan.life',
                email: 'support@jianyuan.life',
              },
            }),
          }}
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
              <Image src="/logo-footer.svg" alt="鑒源" width={200} height={100} className="mx-auto mb-3" />
              <p className="text-base text-text-muted font-medium tracking-wider">回到源頭 &middot; 看清本質</p>
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
                <h4 className="text-gold/80 font-semibold mb-3">了解更多</h4>
                <div className="space-y-2 text-text-muted">
                  <a href="/#systems" className="block hover:text-gold transition-colors">十五大系統</a>
                  <a href="/#how" className="block hover:text-gold transition-colors">分析流程</a>
                  <a href="/blog" className="block hover:text-gold transition-colors">命理知識</a>
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
              <p>本服務融合傳統命理學與現代科技，分析結果僅供參考，不構成任何醫療、投資或法律建議。</p>
              <p className="mt-2">&copy; {new Date().getFullYear()} 鑒源 JianYuan. All rights reserved. &middot; v4.5.22</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
