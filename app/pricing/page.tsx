'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PriceTag from '@/components/PriceTag'

const PLANS = {
  personal: [
    { code: 'C', name: '人生藍圖', price: 89, popular: true, systems: 15,
      desc: '一份報告，看清人生全貌——性格天賦、事業方向、財運走勢、感情歸宿、大運機遇，十五套系統交叉驗證，給你最完整的答案',
      suitableFor: '如果你想一次看清自己的全貌，或者站在人生十字路口需要方向',
      features: ['性格天賦+行為模式深度解析', '事業方向+行業適配分析', '財運走向+投資風格', '感情婚姻+相處模式', '健康+養生方向', '人際貴人+合作對象', '人生機遇+大運走勢', '好的/注意/改善 三大建議', '網頁展示+PDF報告（6,000-10,000字）'],
    },
    { code: 'D', name: '心之所惑', price: 39, systems: 15,
      desc: '心裡有一個放不下的問題？選一個面向，讓十五套系統給你一個完整的答案',
      suitableFor: '如果你有一個具體的困惑——該不該換工作？這段感情有未來嗎？財運何時好轉？',
      features: ['可選：財運/事業/感情/健康/學業/搬家', '用 200 字描述你的困惑', '十五套系統聚焦分析', '好的/注意/改善 三大建議', 'PDF報告（3,000-5,000字）'],
      hasQuestion: true,
    },
  ],
  family: [
    { code: 'G15', name: '家族藍圖', price: 269, systems: 15,
      desc: '每位家人獨立完整分析，再加上家庭互動關係、親子溝通模式、共同運勢走向——全家人的命格，一次看透',
      suitableFor: '如果你想了解孩子的天賦方向、夫妻相處之道、或家庭成員之間為什麼總有摩擦',
      features: ['含4人（每加1人+$69）', '每人獨立完整分析報告', '家庭動力學+互動關係', '家運走勢+共同建議', '好的/注意/改善 三大建議'],
      addPrice: 69,
    },
    { code: 'R', name: '合否？', price: 59, systems: 15,
      desc: '感情交往、結婚、合夥創業——你們在命理上到底合不合？兩人命格交叉分析，找出契合與衝突的關鍵',
      suitableFor: '如果你正在考慮結婚、合夥，或者想知道跟某個人為什麼老是合不來',
      features: ['含兩人分析（每加1人+$19）', '合盤分析+互動建議', '對方可只提供年月日', '描述你的關係問題（200字）', '好的/注意/改善 三大建議'],
      addPrice: 19, hasQuestion: true,
    },
  ],
  fortune: [] as never[],
  chumenji: [
    { code: 'E1', name: '事件出門訣', price: 119,
      desc: '針對特定重要事件，精確排算前後所有時辰的奇門局，套入個人命格驗證，交出最精準的 Top5 出行方案',
      features: ['描述事件背景+期望結果（200字）', '排算事件前後全時段奇門局', '套入命格找出個人吉位', 'Top5 精選吉時+方向+邏輯說明', 'Google Calendar 一鍵新增', '計算需 40 分鐘以上'],
      hasQuestion: true,
    },
    { code: 'E2', name: '月盤出門訣', price: 89,
      desc: '從購買日起，排算未來一個月共 360 個時辰的奇門局，套入您的命格找出最適合出行的時機與方位',
      features: ['排算未來 30 天 × 12 時辰 = 360 個時辰', '每個時辰獨立起奇門局', '套入個人命格交叉驗證吉位', 'Top5 精選吉時+方向+完整邏輯', 'Google Calendar 一鍵新增', '計算需 40 分鐘以上'],
    },
  ],
}

export default function PricingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
  }, [])

  const handleSelect = (code: string) => {
    if (loggedIn) { window.location.href = `/checkout?plan=${code}` }
    else { sessionStorage.setItem('pending_plan', code); window.location.href = '/auth/login' }
  }

  type Plan = { code: string; name: string; price: number; desc: string; features: string[]; systems?: number; popular?: boolean; locked?: boolean; seasonal?: boolean; hasQuestion?: boolean; addPrice?: number; suitableFor?: string }
  const Section = ({ title, subtitle, plans }: { title: string; subtitle: string; plans: Plan[] }) => (
    <div className="mb-16">
      <div className="divider-ornament text-gold/30 mb-4">
        <span className="text-xs tracking-[0.2em]">{title}</span>
      </div>
      <p className="text-center text-text-muted text-sm mb-8">{subtitle}</p>
      <div className={`grid grid-cols-1 ${plans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5`}>
        {plans.map((plan) => (
          <div key={plan.code}
            className={`relative glass rounded-2xl p-6 flex flex-col transition-all ${
              plan.popular ? 'border-gold/40 ring-1 ring-gold/20' : ''
            } ${plan.seasonal ? 'opacity-60' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gold text-dark text-[10px] font-bold rounded-full">推薦</div>
            )}
            {plan.seasonal && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-red-accent text-cream text-[10px] font-bold rounded-full">2027年1月開放</div>
            )}
            <div className="text-xs text-gold/70 font-mono mb-1">方案 {plan.code}</div>
            <h3 className="text-lg font-bold text-cream" style={{ fontFamily: 'var(--font-sans)' }}>{plan.name}</h3>
            <p className="text-xs text-text-muted mt-1 mb-2">{plan.desc}</p>
            {plan.suitableFor && (
              <p className="text-[10px] text-gold/70 mb-4 flex items-start gap-1">
                <span className="shrink-0 mt-px">&#9733;</span>
                <span>適合：{plan.suitableFor}</span>
              </p>
            )}
            <div className="mb-4">
              <PriceTag usd={plan.price} size="lg" />
              {plan.addPrice && <span className="text-xs text-text-muted ml-2">加人 +${plan.addPrice}/人</span>}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-text">
                  <span className="text-gold mt-0.5">&#10003;</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => !plan.seasonal && handleSelect(plan.code)}
              disabled={plan.seasonal}
              className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                plan.popular ? 'bg-gold text-dark btn-glow' :
                plan.seasonal ? 'bg-white/5 text-text-muted/40 cursor-not-allowed' :
                plan.locked ? 'glass text-gold hover:bg-gold/10' :
                'glass text-cream hover:bg-white/10'
              }`}>
              {plan.seasonal ? '2027年1月開放' : plan.locked ? '需先有命格分析' : loggedIn ? '選擇此方案' : '註冊後購買'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
          <span className="text-gradient-gold">方案與定價</span>
        </h1>
        <p className="text-center text-text-muted mb-4 max-w-xl mx-auto text-sm">
          6 種方案，從個人到家庭，從了解自己到採取行動。每份報告含網頁展示 + PDF 永久保存。
        </p>
        {!loggedIn && (
          <p className="text-center text-xs text-gold mb-12">
            &#128274; 購買前需先<a href="/auth/signup" className="underline">免費註冊</a>或<a href="/auth/login" className="underline">登入</a>
          </p>
        )}

        <Section title="個人命格分析" subtitle="了解自己，掌握人生方向" plans={PLANS.personal} />
        <Section title="家庭與關係" subtitle="家人之間的命格交織與互動" plans={PLANS.family} />

        {/* 出門訣特殊區塊 */}
        <div className="mb-16">
          <div className="divider-ornament text-gold/30 mb-4">
            <span className="text-xs tracking-[0.2em]">奇門遁甲出門訣</span>
          </div>
          <div className="glass rounded-2xl p-6 mb-8 max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-gradient-gold mb-3" style={{ fontFamily: 'var(--font-sans)' }}>什麼是出門訣？</h3>
            <p className="text-sm text-text leading-[1.9] mb-4">
              在命理上，每個特定的時辰都有一個能量最旺的方位。出門訣就是找到這個時機——
              在吉時從家出發，往吉利的方位走，到達後靜待 40 分鐘，讓自己沐浴在這股能量之中，再回家或去辦事。
            </p>
            <p className="text-sm text-text leading-[1.9] mb-4">
              整個過程大約 70 分鐘，但對運勢的影響可以持續整個月。
              如果你想讓命理分析不只停留在「了解自己」，而是真正採取行動改變運勢，出門訣是最直接的方式。
            </p>
            <div className="rounded-xl bg-gold/5 border border-gold/10 p-4 text-xs text-text-muted">
              <strong className="text-gold">操作方式：</strong>購買後填寫出生資料，系統將自動為您排盤並找出最佳出行時機。
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {PLANS.chumenji.map((plan) => (
              <div key={plan.code}
                className="relative glass rounded-2xl p-6 flex flex-col transition-all">
                <div className="text-xs text-gold/70 font-mono mb-1">方案 {plan.code}</div>
                <h3 className="text-lg font-bold text-cream" style={{ fontFamily: 'var(--font-sans)' }}>{plan.name}</h3>
                <p className="text-xs text-text-muted mt-1 mb-2">{plan.desc}</p>
                <div className="mb-4"><PriceTag usd={plan.price} size="lg" /></div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text">
                      <span className="text-gold mt-0.5">&#10003;</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSelect(plan.code)}
                  className="w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer glass text-gold hover:bg-gold/10">
                  {loggedIn ? '選擇此方案' : '註冊後購買'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 方案對比表 */}
        <div className="mb-16 max-w-4xl mx-auto">
          <div className="divider-ornament text-gold/30 mb-4">
            <span className="text-xs tracking-[0.2em]">方案比較</span>
          </div>
          <p className="text-center text-text-muted text-sm mb-8">一目了然，找到最適合你的方案</p>
          <div className="glass rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold/10">
                  <th className="text-left p-4 text-text-muted font-normal">功能</th>
                  <th className="p-4 text-gold text-center font-semibold">心之所惑<br/><span className="text-xs text-text-muted font-normal">$39</span></th>
                  <th className="p-4 text-gold text-center font-semibold bg-gold/5">人生藍圖<br/><span className="text-xs text-text-muted font-normal">$89</span></th>
                  <th className="p-4 text-gold text-center font-semibold">合否？<br/><span className="text-xs text-text-muted font-normal">$59</span></th>
                  <th className="p-4 text-gold text-center font-semibold">家族藍圖<br/><span className="text-xs text-text-muted font-normal">$269起</span></th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  { feature: '分析系統數', d: '15套', c: '15套', r: '15套', g: '15套' },
                  { feature: '性格天賦分析', d: '&#10003;', c: '&#10003;', r: '&#10003;', g: '&#10003;' },
                  { feature: '事業財運分析', d: '單面向', c: '&#10003;', r: '--', g: '&#10003;' },
                  { feature: '感情婚姻分析', d: '單面向', c: '&#10003;', r: '&#10003;', g: '&#10003;' },
                  { feature: '大運流年走勢', d: '--', c: '&#10003;', r: '--', g: '&#10003;' },
                  { feature: '專項問題深度剖析', d: '&#10003;', c: '--', r: '&#10003;', g: '--' },
                  { feature: '多人互動分析', d: '--', c: '--', r: '&#10003;', g: '&#10003;' },
                  { feature: '家庭動力學', d: '--', c: '--', r: '--', g: '&#10003;' },
                  { feature: 'PDF 完整報告', d: '&#10003;', c: '&#10003;', r: '&#10003;', g: '&#10003;' },
                  { feature: '報告字數', d: '3000-5000字', c: '6000-10000字', r: '5000字+', g: '每人6000字+' },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-gold/5 hover:bg-white/3">
                    <td className="p-3 text-cream">{row.feature}</td>
                    <td className="p-3 text-center text-text-muted" dangerouslySetInnerHTML={{ __html: row.d.replace('&#10003;', '<span class="text-gold">&#10003;</span>') }} />
                    <td className="p-3 text-center text-text-muted bg-gold/5" dangerouslySetInnerHTML={{ __html: row.c.replace('&#10003;', '<span class="text-gold">&#10003;</span>') }} />
                    <td className="p-3 text-center text-text-muted" dangerouslySetInnerHTML={{ __html: row.r.replace('&#10003;', '<span class="text-gold">&#10003;</span>') }} />
                    <td className="p-3 text-center text-text-muted" dangerouslySetInnerHTML={{ __html: row.g.replace('&#10003;', '<span class="text-gold">&#10003;</span>') }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 推薦指南 */}
        <div className="max-w-3xl mx-auto glass rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gradient-gold mb-4" style={{ fontFamily: 'var(--font-sans)' }}>不確定選哪個？</h3>
          <div className="space-y-3 text-sm text-text">
            <p><strong className="text-cream">第一次體驗：</strong>先去<a href="/tools/bazi" className="text-gold underline">免費速算</a>看效果，再選「心之所惑」（$39）聚焦你最在乎的問題。</p>
            <p><strong className="text-cream">全面了解自己：</strong>「人生藍圖」（$89）完整分析人生各面向，最超值。</p>
            <p><strong className="text-cream">有特定困惑：</strong>「心之所惑」（$39）聚焦一個面向深入剖析。</p>
            <p><strong className="text-cream">全家分析：</strong>「家族藍圖」（$269起）每人獨立報告+家庭互動分析。</p>
            <p><strong className="text-cream">感情/合夥：</strong>「合否？」（$59）兩人命理交叉分析，看你們合不合。</p>
            <p><strong className="text-cream">想採取行動：</strong>先做「人生藍圖」了解自己，再加出門訣，在最好的時機出行改運。</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="divider-ornament text-gold/30 mb-4">
            <span className="text-xs tracking-[0.2em]">常見問題</span>
          </div>
          <p className="text-center text-text-muted text-sm mb-8">購買前您可能想知道的事</p>
          {[
            { q: '命理分析真的準確嗎？', a: '鑒源的排盤計算使用確定性算法，與專業命理軟體一致。解讀基於數十部經典古籍提煉的 34,458 條規則，再由 AI 引擎整合。最重要的是，我們用十五套系統交叉驗證——當多數系統得出相同結論時，準確度遠高於單一系統。不同於人為判斷，每次分析的結果都是可重複、可驗證的。' },
            { q: '報告多久生成？', a: '個人報告（人生藍圖、心之所惑）約 30 分鐘；家族藍圖和合否根據人數而定；出門訣因需排算數百個時辰，約需 40 分鐘以上。付款後系統全自動運算，完成後立即 Email 通知。' },
            { q: '可以退款嗎？', a: '報告為虛擬數位內容，一旦開始生成即消耗大量運算資源，因此生成後不支持退款。如果報告品質有任何問題，請聯繫 support@jianyuan.life，我們會免費重新生成。' },
            { q: '付款方式有哪些？安全嗎？', a: '透過 Stripe（PCI DSS Level 1 認證）處理，支援 Visa、Mastercard、AMEX 等主流信用卡。您的卡號不會經過鑒源伺服器，全程加密。' },
            { q: '人生藍圖和心之所惑有什麼差別？', a: '「人生藍圖」是全面分析——涵蓋性格、事業、財運、感情、健康、大運等所有面向，報告 6,000-10,000 字。「心之所惑」則聚焦在你最在乎的一個問題，深入剖析，報告 3,000-5,000 字。如果你有明確的困惑，心之所惑更精準；如果想全面了解自己，人生藍圖更完整。' },
            { q: '出門訣適合什麼場合？', a: '任何你希望有好結果的重大事件：面試、簽約、開業、搬家、相親、考試等。事件出門訣（$119）針對單一事件排算；月盤出門訣（$89）則為你排算未來 30 天的最佳出行時機，適合需要持續改運的人。' },
            { q: '不確定出生時間怎麼辦？', a: '可以選擇最接近的時辰。即使時間不完全精確，十五套系統中有多套不依賴精確時辰（如姓名學、數字能量學、生肖運勢等），仍能提供有價值的分析。' },
          ].map((faq) => (
            <details key={faq.q} className="glass rounded-lg mb-3 group">
              <summary className="p-5 cursor-pointer font-semibold text-cream flex justify-between items-center text-sm">
                {faq.q}
                <span className="text-gold group-open:rotate-45 transition-transform text-lg ml-4 shrink-0">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-text-muted leading-[1.9] border-t border-gold/5 pt-4">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
