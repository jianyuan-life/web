'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PriceTag from '@/components/PriceTag'

const PLANS = {
  personal: [
    { code: 'C', name: '人生藍圖', price: 89, popular: true, systems: 15,
      desc: '涵蓋性格天賦、感情婚姻、事業財運、健康、流年運勢等完整人生面向分析',
      features: ['性格天賦+行為模式深度解析', '事業方向+行業適配分析', '財運走向+投資風格', '感情婚姻+相處模式', '健康+養生方向', '人際貴人+合作對象', '人生機遇+大運走勢', '好的/注意/改善 三大建議', '網頁展示+PDF報告'],
    },
    { code: 'D', name: '心之所惑', price: 39, systems: 15,
      desc: '聚焦你最在乎的一個面向，深度剖析',
      features: ['可選：財運/事業/感情/健康/學業/搬家', '描述你最想釐清的困惑（200字）', '針對你的問題全面分析', '好的/注意/改善 三大建議', 'PDF報告'],
      hasQuestion: true,
    },
  ],
  family: [
    { code: 'G15', name: '家族藍圖', price: 269, systems: 15,
      desc: '涵蓋每位成員的性格天賦、家庭關係互動、共同運勢走向，為全家人做完整的命理規劃',
      features: ['含4人（每加1人+$69）', '每人獨立完整分析報告', '家庭動力學+互動關係', '家運走勢+共同建議', '好的/注意/改善 三大建議'],
      addPrice: 69,
    },
    { code: 'R', name: '合否？', price: 59, systems: 15,
      desc: '感情交往、合婚、合夥、任何兩人關係——命理上，你們合嗎？',
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

  type Plan = { code: string; name: string; price: number; desc: string; features: string[]; systems?: number; popular?: boolean; locked?: boolean; seasonal?: boolean; hasQuestion?: boolean; addPrice?: number }
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
            <p className="text-xs text-text-muted mt-1 mb-4">{plan.desc}</p>
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
          從個人到家庭，6種方案清晰選擇。所有報告含網頁展示+PDF+專業分析。
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
                <p className="text-xs text-text-muted mt-1 mb-4">{plan.desc}</p>
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

        {/* 推薦指南 */}
        <div className="max-w-3xl mx-auto glass rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gradient-gold mb-4" style={{ fontFamily: 'var(--font-sans)' }}>不確定選哪個？</h3>
          <div className="space-y-3 text-sm text-text">
            <p><strong className="text-cream">第一次體驗：</strong>先去<a href="/tools/bazi" className="text-gold underline">免費速算</a>看效果，再選「心之所惑」（$39）聚焦你最在乎的問題。</p>
            <p><strong className="text-cream">全面了解自己：</strong>「人生藍圖」（$89）完整分析人生各面向，最超值。</p>
            <p><strong className="text-cream">有特定困惑：</strong>「心之所惑」（$39）聚焦一個面向深入剖析。</p>
            <p><strong className="text-cream">全家分析：</strong>「家族藍圖」（$269起）每人獨立報告+家庭互動分析。</p>
            <p><strong className="text-cream">感情/合夥：</strong>「合否？」（$59）兩人命理交叉分析，看你們合不合。</p>
            <p><strong className="text-cream">想採取行動：</strong>先做「人生藍圖」，再加出門訣，在最好的時機出行改運。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
