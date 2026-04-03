'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PriceTag from '@/components/PriceTag'

const PLANS = {
  personal: [
    { code: 'C', name: '全方位十五合一', price: 89, popular: true, systems: 15,
      desc: '15套東西方命理系統全面人格分析',
      features: ['人格深度分析+行為模式', '事業方向+行業分析', '財運+投資風格', '感情+婚姻特質', '健康+五行養生', '人際+貴人分析', '人生機遇+大運走勢', '好的/注意/改善 三大建議', '網頁展示+PDF報告'],
    },
    { code: 'A', name: '核心三合一', price: 49, systems: 3,
      desc: '八字+紫微+奇門三大核心系統',
      features: ['三大核心系統交叉驗證', '人格分析+事業方向', '財運+感情+健康', '人生機遇分析', '好的/注意/改善 三大建議', '網頁展示+PDF報告'],
    },
    { code: 'D', name: '專項深度分析', price: 29, systems: 15,
      desc: '針對一個問題深入分析',
      features: ['可選：財運/事業/感情/健康/學業/搬家', '問事版：描述你的問題（200字）', '調用所有相關系統', '好的/注意/改善 三大建議', 'PDF報告'],
      hasQuestion: true,
    },
  ],
  family: [
    { code: 'G15', name: '家庭全方位十五合一', price: 269, systems: 15,
      desc: '全家人15系統分析+家庭總方案',
      features: ['含4人（每加1人+$69）', '每人獨立15系統報告', '家庭動力學分析', '互動建議+家運分析', '好的/注意/改善 三大建議'],
      addPrice: 69,
    },
    { code: 'G3', name: '家庭核心三合一', price: 149, systems: 3,
      desc: '全家人3系統分析+家庭總方案',
      features: ['含4人（每加1人+$39）', '每人獨立3系統報告', '家庭關係分析', '互動建議', '好的/注意/改善 三大建議'],
      addPrice: 39,
    },
    { code: 'R', name: '關於我與他', price: 59, systems: 15,
      desc: '感情/合婚/合夥/家庭關係',
      features: ['含3人（每加1人+$19）', '合盤分析+互動建議', '對方可只提供年月日', '問題詳述（200字）', '好的/注意/改善 三大建議'],
      addPrice: 19, hasQuestion: true,
    },
  ],
  fortune: [
    { code: 'M', name: '月度運勢分析', price: 19, systems: 14,
      desc: '當月全面運勢分析',
      features: ['14系統全面分析（不含出門訣）', '財運/事業/感情/健康', '重要日期提醒', '農曆月份標註國曆日期', '好的/注意/改善 三大建議'],
    },
    { code: 'Y', name: '年度運勢分析', price: 159, systems: 14, popular: true,
      desc: '12個月逐月詳細分析',
      features: ['14系統全面分析（不含出門訣）', '逐月運勢（12個月）', '每月好的/注意/改善', '農曆月份標註國曆日期', '重要月份和日期提醒'],
    },
  ],
  chumenji: [
    { code: 'E1', name: '事件出門訣', price: 119,
      desc: '單一事件奇門擇吉 Top5',
      features: ['需先購買C或A方案', '提供事件時間+背景（200字）', 'Top5 吉時方位', 'Google Calendar 邀請', 'PDF+坐盤教學'],
      locked: true, hasQuestion: true,
    },
    { code: 'E2', name: '月盤出門訣', price: 89,
      desc: '當月 Top5 吉時方位',
      features: ['需先購買C或A方案', '當月 Top5 精選吉時', '方位+時間+做盤原因', 'Google Calendar 邀請', 'PDF+坐盤教學'],
      locked: true,
    },
    { code: 'E3', name: '年盤出門訣', price: 859, systems: 0,
      desc: '全年月盤+年盤 Top5',
      features: ['需先購買C或A方案', '2027農曆年前一個月開放（約2027年1月）', '年盤Top5 + 逐月月盤Top5', '全年Google Calendar', 'PDF+完整坐盤教學'],
      locked: true, seasonal: true,
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
          從入門到全面，11種方案滿足不同需求。所有報告含網頁展示+PDF+專業分析。
        </p>
        {!loggedIn && (
          <p className="text-center text-xs text-gold mb-12">
            &#128274; 購買前需先<a href="/auth/signup" className="underline">免費註冊</a>或<a href="/auth/login" className="underline">登入</a>
          </p>
        )}

        <Section title="個人命格分析" subtitle="了解自己，掌握人生方向" plans={PLANS.personal} />
        <Section title="家庭與關係" subtitle="家人之間的命格交織與互動" plans={PLANS.family} />
        <Section title="運勢分析" subtitle="把握時機，順勢而為" plans={PLANS.fortune} />

        {/* 出門訣特殊區塊 */}
        <div className="mb-16">
          <div className="divider-ornament text-gold/30 mb-4">
            <span className="text-xs tracking-[0.2em]">奇門遁甲出門訣</span>
          </div>
          <div className="glass rounded-2xl p-6 mb-8 max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-gradient-gold mb-3" style={{ fontFamily: 'var(--font-sans)' }}>什麼是出門訣？</h3>
            <p className="text-sm text-text leading-[1.9] mb-4">
              出門訣源自奇門遁甲古法，是根據您的個人命盤，在特定的時間往特定的方位出行，
              藉由天地磁場的力量為自己補充正能量。古人稱之為「沐吉氣」——
              在對的時間、對的方向、定點停留，讓天地之氣滋養身心。
            </p>
            <p className="text-sm text-text leading-[1.9] mb-4">
              每次出門訣約需 70 分鐘（出行15分鐘 + 定點40分鐘 + 回程15分鐘），
              簡單易行但效果持久。我們為您精選 Top5 最佳時段，每個時段都經過命盤交叉驗證，確保最適合您。
            </p>
            <div className="rounded-xl bg-gold/5 border border-gold/10 p-4 text-xs text-text-muted">
              <strong className="text-gold">前置條件：</strong>出門訣需要您的個人命盤數據，因此必須先完成「全方位十五合一」或「核心三合一」分析。
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PLANS.chumenji.map((plan) => (
              <div key={plan.code}
                className={`relative glass rounded-2xl p-6 flex flex-col transition-all ${plan.seasonal ? 'opacity-60' : ''}`}>
                {plan.seasonal && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-red-accent text-cream text-[10px] font-bold rounded-full">2027年1月開放</div>
                )}
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
                <button onClick={() => !plan.seasonal && handleSelect(plan.code)}
                  disabled={plan.seasonal}
                  className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    plan.seasonal ? 'bg-white/5 text-text-muted/40 cursor-not-allowed' : 'glass text-gold hover:bg-gold/10'
                  }`}>
                  {plan.seasonal ? '2027年1月開放' : '需先有命格分析'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 推薦指南 */}
        <div className="max-w-3xl mx-auto glass rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gradient-gold mb-4" style={{ fontFamily: 'var(--font-sans)' }}>不確定選哪個？</h3>
          <div className="space-y-3 text-sm text-text">
            <p><strong className="text-cream">第一次體驗：</strong>先去<a href="/tools/bazi" className="text-gold underline">免費速算</a>看效果，再選 A 方案（$49）入門。</p>
            <p><strong className="text-cream">全面了解自己：</strong>C 方案（$89）15系統全開，最完整最超值。</p>
            <p><strong className="text-cream">有特定問題：</strong>D 方案（$29）針對一個問題深入，還能描述你的具體情況。</p>
            <p><strong className="text-cream">看看這個月：</strong>M 方案（$19）最便宜，了解當月運勢和注意事項。</p>
            <p><strong className="text-cream">全家分析：</strong>G15（$269）最完整，包含家庭互動和家運分析。</p>
            <p><strong className="text-cream">感情/合夥：</strong>R 方案（$59）專門分析你和他人的關係。</p>
            <p><strong className="text-cream">開運補氣：</strong>先做 C 或 A，再加出門訣，每月補充正能量。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
