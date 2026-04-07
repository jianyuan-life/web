// 報告預覽模擬畫面
export default function ReportPreview() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="divider-ornament text-gold/30 mb-6 justify-center">
          <span className="text-xs tracking-[0.2em]">報告實例</span>
        </div>
        <h2 className="text-2xl md:text-3xl text-center mb-4 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
          一份報告，能幫你看到什麼？
        </h2>
        <p className="text-center text-text-muted text-sm mb-12 max-w-xl mx-auto leading-relaxed">
          以「人生藍圖」方案為例，這是你將收到的完整命格分析報告
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* 左：報告模擬 */}
          <div className="relative">
            <div className="glass rounded-2xl overflow-hidden p-6 border border-gold/10 shadow-2xl">
              {/* 瀏覽器頂欄 */}
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gold/8">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="ml-2 text-[11px] text-text-muted bg-black/20 px-3 py-1 rounded-md">
                  jianyuan.life/report/...
                </span>
              </div>

              <div className="space-y-4">
                {/* 命格總覽 */}
                <div className="rounded-xl p-4 bg-gold/[0.03] border border-gold/[0.06]">
                  <div className="text-[10px] text-gold/60 tracking-wider">Chapter 01</div>
                  <h5 className="text-sm text-cream mt-1 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    命格總覽 &mdash; 你的先天格局
                  </h5>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded bg-white/[0.04] w-full" />
                    <div className="h-2 rounded bg-white/[0.04] w-[85%]" />
                    <div className="h-2 rounded bg-white/[0.04] w-[92%]" />
                  </div>
                </div>

                {/* 評分條 */}
                <div className="rounded-xl p-4 bg-gold/[0.03] border border-gold/[0.06]">
                  <div className="text-[10px] text-gold/60 tracking-wider">Chapter 05</div>
                  <h5 className="text-sm text-cream mt-1 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                    事業與財運分析
                  </h5>
                  {[
                    { name: '八字', score: 82 },
                    { name: '紫微', score: 76 },
                    { name: '占星', score: 88 },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-text-muted w-10">{s.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gold/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gold w-6 text-right">{s.score}</span>
                    </div>
                  ))}
                </div>

                {/* 寫給你的話 */}
                <div className="rounded-xl p-4 bg-gold/[0.03] border border-gold/[0.06]">
                  <div className="text-[10px] text-gold/60 tracking-wider">Chapter 15</div>
                  <h5 className="text-sm text-cream mt-1 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    寫給你的話
                  </h5>
                  <div className="space-y-1.5">
                    <div className="h-2 rounded bg-white/[0.04] w-full" />
                    <div className="h-2 rounded bg-white/[0.04] w-[78%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* 浮動評分卡 */}
            <div className="absolute top-[20%] -right-4 lg:right-[-40px] glass rounded-xl p-4 shadow-2xl animate-float hidden md:block">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] text-text-muted">綜合評分</div>
                  <div className="text-lg font-bold text-gradient-gold">85/100</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右：說明 */}
          <div>
            <h3 className="text-2xl text-cream mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
              深度、有溫度的命格報告
            </h3>
            <p className="text-text-muted leading-[2] mb-8">
              不是千篇一律的模板，而是根據你的出生資料，由 15 套系統精密運算後整合而成的專屬報告。
            </p>

            <div className="space-y-5 mb-8">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" className="w-[18px] h-[18px]">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  ),
                  title: '6,000 - 10,000 字深度分析',
                  desc: '涵蓋性格、事業、財運、感情、健康五大面向',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" className="w-[18px] h-[18px]">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  ),
                  title: '精美 PDF 永久保存',
                  desc: '隨時回顧，也可以分享給你信任的人',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" className="w-[18px] h-[18px]">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  ),
                  title: '寫給你的話 — 專屬結語',
                  desc: '不只分析數據，更用有溫度的語言給你力量和方向',
                },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-gold/[0.06] border border-gold/10 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="text-sm text-cream mb-0.5">{f.title}</h4>
                    <p className="text-xs text-text-muted">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-dark font-bold rounded-lg btn-glow text-sm"
            >
              查看完整方案
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
