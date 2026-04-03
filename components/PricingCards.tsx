'use client'

import PriceTag from './PriceTag'

const PLANS = [
  { code: 'D', name: '專項深度分析', price: 29, desc: '針對一個問題深入', features: ['財運/事業/感情/健康/學業/搬家', '問事版：描述你的問題', '好的/注意/改善三大建議'], cta: '最低入門' },
  { code: 'C', name: '全方位十五合一', price: 89, popular: true, desc: '15系統全面人格分析', features: ['全部15套命理系統', '人格+事業+財運+感情+健康', '行業分析+人生機遇', '好的/注意/改善三大建議', '網頁展示+PDF報告'], cta: '最受歡迎' },
  { code: 'Y', name: '年度運勢分析', price: 159, desc: '12個月逐月分析', features: ['14系統全面分析', '逐月運勢+好/注意/改善', '重要月份和日期提醒', '農曆對照國曆日期'], cta: '長期規劃' },
]

export default function PricingCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PLANS.map((plan) => (
        <div key={plan.code}
          className={`relative glass rounded-2xl p-7 flex flex-col transition-all duration-300 ${plan.popular ? 'border-gold/40 ring-1 ring-gold/20 md:scale-[1.03]' : ''}`}>
          {plan.popular && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-dark text-[11px] font-bold rounded-full shadow-lg shadow-gold/20">
              {plan.cta}
            </div>
          )}
          {!plan.popular && <div className="text-xs text-gold/70 font-mono mb-1">{plan.cta}</div>}
          <h3 className="text-xl font-bold text-cream" style={{ fontFamily: 'var(--font-sans)' }}>{plan.name}</h3>
          <p className="text-xs text-text-muted mt-1">{plan.desc}</p>
          <div className="my-5">
            <PriceTag usd={plan.price} size="lg" />
            <span className="text-sm text-text-muted ml-1">/ 份</span>
          </div>
          <ul className="space-y-2.5 mb-7 flex-1">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text">
                <span className="text-gold mt-0.5 text-xs">&#10003;</span>{f}
              </li>
            ))}
          </ul>
          <a href={`/checkout?plan=${plan.code}`}
            className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.popular ? 'bg-gold text-dark btn-glow' : 'glass text-cream hover:bg-white/10'}`}>
            選擇方案
          </a>
        </div>
      ))}
    </div>
  )
}
