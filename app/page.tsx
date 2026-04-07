import PricingCards from '@/components/PricingCards'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '鑒源 JianYuan — 十五大命理系統 AI 精準分析｜八字、紫微斗數、奇門遁甲',
  description: '鑒源整合八字、紫微斗數、奇門遁甲、西洋占星等十五大東西方命理系統，結合 34,458 條古籍規則與 AI 深度分析，為您提供性格天賦、事業財運、感情婚姻的完整命格報告。免費體驗，30 秒出結果。',
  keywords: '命理, 八字, 紫微斗數, 奇門遁甲, 西洋占星, 命盤, 命格分析, AI命理, 免費算命, 姓名學, 風水, 人類圖, 吠陀占星, 出門訣, 運勢',
  openGraph: {
    title: '鑒源 JianYuan — 十五大命理系統 AI 精準分析',
    description: '整合東西方十五大命理系統與 AI，一份報告看清性格天賦、事業方向、感情運勢。免費體驗，不需註冊。',
    url: 'https://jianyuan.life',
    siteName: '鑒源 JianYuan',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: '鑒源 JianYuan — 十五大命理系統 AI 精準分析',
    description: '整合東西方十五大命理系統與 AI，一份報告看清性格天賦、事業方向、感情運勢。',
  },
  alternates: {
    canonical: 'https://jianyuan.life',
  },
}

const SYSTEMS = [
  { name: '八字命理', tier: 1, desc: '以天干地支排列四柱，推算先天格局、大運流年與十神六親關係' },
  { name: '紫微斗數', tier: 1, desc: '安星佈盤十二宮位，主星四化飛星，揭示一生命運軌跡' },
  { name: '奇門遁甲', tier: 1, desc: '天盤地盤九宮排布，八門九星八神，擇吉避凶運籌帷幄' },
  { name: '風水堪輿', tier: 2, desc: '八宅命卦與玄空飛星，因地制宜調整居家磁場' },
  { name: '西洋占星', tier: 2, desc: '太陽月亮上升三大星座，行星相位與宮位行運' },
  { name: '姓名學', tier: 2, desc: '康熙筆畫五格剖象，81靈動數與三才五行配置' },
  { name: '吠陀占星', tier: 2, desc: '源自印度古典《吠陀經》，恆星制27星宿與Dasha大限' },
  { name: '易經占卜', tier: 2, desc: '梅花易數起卦，六十四卦象體用互變，窮理盡性' },
  { name: '人類圖', tier: 2, desc: '融合易經、占星、脈輪與卡巴拉，揭示您的能量類型與策略' },
  { name: '數字能量學', tier: 3, desc: '生命靈數與九宮格缺數分析，揭示數字背後的生命密碼' },
  { name: '古典占星', tier: 3, desc: '七政四餘推步天象，二十八宿與九星飛泊' },
  { name: '塔羅牌', tier: 3, desc: '人格牌與靈魂牌原型分析，映照潛意識的智慧之鏡' },
  { name: '生肖運勢', tier: 3, desc: '太歲關係、納音五行、三合六合與流年生肖運' },
  { name: '生物節律', tier: 3, desc: '體力、情緒、智力三大週期精算，掌握每日最佳狀態' },
  { name: '南洋術數', tier: 3, desc: 'KP占星、泰國皇家占星、緬甸Mahabote多元文化智慧' },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero — 古典命理風 */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-gold/8 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-gold/5 rounded-full animate-spin" style={{ animationDuration: '80s' }} />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <div className="divider-ornament text-gold/40 mb-8">
            <span className="text-sm tracking-[0.3em]">鑒源 &middot; JianYuan</span>
          </div>
          <h1 className="text-4xl md:text-6xl leading-[1.2] mb-6 tracking-wide" style={{ fontFamily: 'var(--font-sans)' }}>
            <span className="text-cream">十五套系統交叉驗證</span>
            <br />
            <span className="text-gradient-gold">一份報告，看清自己</span>
          </h1>
          <p className="text-base md:text-lg text-text-muted mb-10 max-w-xl mx-auto leading-[1.9]">
            不再依賴單一命理師的主觀判斷。<br />
            鑒源整合八字、紫微、奇門遁甲、西洋占星等十五大系統，
            用 34,458 條專業規則交叉比對，給你經得起驗證的命格分析。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/tools/bazi"
              className="px-8 py-3.5 bg-gold text-dark font-bold rounded-lg text-base btn-glow inline-flex items-center justify-center gap-2">
              免費體驗命理速算
            </a>
            <a href="/pricing"
              className="px-8 py-3.5 glass text-cream font-semibold rounded-lg text-base hover:bg-surface-hover transition-colors inline-flex items-center justify-center gap-2">
              探索完整方案
            </a>
          </div>
          <p className="mt-6 text-xs text-text-muted/60">不需註冊 &middot; 30 秒出結果 &middot; 完全免費</p>
        </div>
      </section>

      {/* 信任指標 */}
      <section className="py-14 border-y border-gold/8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '15', label: '命理系統', sub: '東西方完整覆蓋' },
            { num: '34,458', label: '條專業規則', sub: '每條皆有典籍出處' },
            { num: '數十部', label: '經典古籍', sub: '千年智慧數據化' },
            { num: '6', label: '種方案', sub: '從 $39 起' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-gradient-gold" style={{ fontFamily: 'var(--font-sans)' }}>{s.num}</div>
              <div className="text-sm text-cream mt-1">{s.label}</div>
              <div className="text-[11px] text-text-muted">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 為什麼鑒源不一樣 — 差異化對比 */}
      <section className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">差異</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-12 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            市面上的命理服務，和鑒源有什麼不同？
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: '傳統命理師', items: ['只用 1-2 套系統', '結論因人而異，難以驗證', '收費 $100-$300 美金', '等待 3-7 天出結果', '人為偏見影響判斷'], highlight: false },
              { title: '鑒源命理', items: ['15 套系統同時分析', '34,458 條規則客觀運算', '最低 $39 美金起', '最快 30 分鐘完成報告', '數據驅動，可重複驗證'], highlight: true },
              { title: '免費算命網站', items: ['套公式的罐頭回覆', '千篇一律的描述', '沒有個人化深度', '無法回答「為什麼」', '沒有行動建議'], highlight: false },
            ].map((col) => (
              <div key={col.title} className={`rounded-2xl p-6 ${col.highlight ? 'glass border-gold/30 ring-1 ring-gold/20' : 'glass'}`}>
                <h3 className={`text-lg font-bold mb-4 ${col.highlight ? 'text-gradient-gold' : 'text-text-muted'}`} style={{ fontFamily: 'var(--font-sans)' }}>{col.title}</h3>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-text">
                      <span className={`mt-0.5 ${col.highlight ? 'text-gold' : 'text-text-muted/50'}`}>{col.highlight ? '\u2713' : '\u2013'}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 為什麼選鑑源 — 獨特價值主張 */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">核心優勢</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-12 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            三大核心，讓命理真正有用
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '\u25C8',
                title: '15套系統交叉驗證',
                desc: '市面上大多數命理服務只用單一系統。鑒源同時運算東西方十五大命理系統，以三層加權架構交叉驗證——不是「某位老師說」，而是十五套系統的共識。',
              },
              {
                icon: '\u25C6',
                title: 'AI + 古籍雙引擎',
                desc: '34,458 條分析規則來自《滴天髓》《紫微斗數全書》等數十部經典古籍，再由 AI 智能引擎整合成有深度、有溫度的個人化報告——不是制式模板。',
              },
              {
                icon: '\u25CA',
                title: '不只看命，還能改運',
                desc: '鑒源獨家「出門訣」服務：根據奇門遁甲排算最佳出行時機與方位，套入個人命格驗證，讓命理不只是「了解自己」，而是真正採取行動改變運勢。',
              },
            ].map((item) => (
              <div key={item.title} className="glass rounded-xl p-6 text-center">
                <div className="text-3xl text-gold mb-4">{item.icon}</div>
                <h3 className="font-semibold text-cream text-base mb-3">{item.title}</h3>
                <p className="text-sm text-text-muted leading-[1.9]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 古籍傳承 — 建立權威感 */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">源流</span>
          </div>
          <h2 className="text-2xl md:text-3xl mb-6 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            植根經典 &middot; 融合科技
          </h2>
          <p className="text-base text-text-muted leading-[2] max-w-2xl mx-auto mb-10">
            本系統的分析框架建立在數十部命理經典之上——
            八字取法《滴天髓》《窮通寶鑑》《子平真詮》，
            紫微參照《紫微斗數全書》《太微賦》，
            奇門依據《奇門遁甲統宗》《煙波釣叟歌》，
            風水根植《青囊經》《沈氏玄空學》。
            每一條分析規則，皆有典籍出處，絕非憑空推演。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['《滴天髓》', '《紫微斗數全書》', '《窮通寶鑑》', '《奇門遁甲統宗》',
              '《子平真詮》', '《青囊經》', '《沈氏玄空學》', '《煙波釣叟歌》'
            ].map(book => (
              <div key={book} className="glass rounded-lg py-3 px-4 text-sm text-gold/80" style={{ fontFamily: 'var(--font-sans)' }}>
                {book}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 分析流程 */}
      <section id="how" className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">流程</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-12 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            五步完成命格分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '壹', title: '免費體驗', desc: '輸入出生資料，即時查看八字排盤與性格分析' },
              { step: '貳', title: '選擇方案', desc: '6種方案，從個人到家庭，從 $39 起' },
              { step: '參', title: '填寫資料', desc: '姓名、出生日期時間、性別，簡單三步' },
              { step: '肆', title: '深度分析', desc: '34,458條規則 + AI 引擎，逐系統精密推算' },
              { step: '伍', title: '查看報告', desc: '線上閱讀 + PDF 永久保存，隨時回顧' },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < 4 && <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-gold/20 to-transparent" />}
                <div className="text-2xl text-gold/80 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>{item.step}</div>
                <h3 className="font-semibold text-cream text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 十五大系統 */}
      <section id="systems" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">十五大系統</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-4 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            東方古典智慧 &middot; 西方占星體系
          </h2>
          <div className="flex justify-center gap-6 mb-10 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold" /> 核心系統</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold/50" /> 補充系統</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold/25" /> 參考系統</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SYSTEMS.map((sys) => (
              <div key={sys.name} className="glass rounded-lg p-4 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-10 rounded-full mt-0.5 shrink-0"
                    style={{ background: `var(--color-gold)`, opacity: sys.tier === 1 ? 1 : sys.tier === 2 ? 0.5 : 0.25 }} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-cream text-sm">{sys.name}</h3>
                      {sys.tier === 1 && <span className="text-[9px] px-1.5 py-0.5 bg-gold/15 text-gold rounded">核心</span>}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">{sys.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 定價 */}
      <section id="pricing" className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">方案</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-2 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            選擇適合您的方案
          </h2>
          <p className="text-center text-text-muted mb-12 text-sm">從 $39 起，每份報告都包含網頁展示 + PDF 永久保存</p>
          <PricingCards />
          <p className="text-center mt-8 text-sm text-text-muted">
            還有家庭、關係、出門訣方案 &middot; <a href="/pricing" className="text-gold hover:underline">查看全部 6 種方案與詳細介紹</a>
          </p>
        </div>
      </section>

      {/* 出門訣推廣 — 核心收入來源 */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass rounded-2xl p-8 md:p-12" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(15,22,40,0.4))' }}>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="text-6xl shrink-0">&#9788;</div>
              <div className="flex-1">
                <div className="text-gold text-xs tracking-[0.2em] mb-2">鑑源獨家</div>
                <h2 className="text-2xl font-bold text-cream mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                  奇門遁甲出門訣 — 讓命理真正落地
                </h2>
                <p className="text-sm text-text-muted leading-[1.9] mb-4">
                  命理分析告訴你「你是誰」，出門訣告訴你「怎麼做」。
                  系統根據奇門遁甲精確排算每個時辰的能量方位，套入您的個人命格驗證，
                  找出最適合您出行的吉時與方位——在對的時間，往對的方向走，讓運勢真正改變。
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-dark font-bold rounded-lg btn-glow text-sm">
                    了解出門訣方案
                  </a>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="text-gold">&#10003;</span> 事件出門訣 $119
                    <span className="mx-1">|</span>
                    <span className="text-gold">&#10003;</span> 月盤出門訣 $89
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 出門訣推廣 — 核心訂閱收入 */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass rounded-2xl p-8 md:p-12" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(15,22,40,0.4))' }}>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="text-6xl shrink-0">&#9788;</div>
              <div className="flex-1">
                <div className="text-gold text-xs tracking-[0.2em] mb-2">鑒源獨家</div>
                <h2 className="text-2xl font-bold text-cream mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                  奇門遁甲出門訣 — 讓命理真正落地
                </h2>
                <p className="text-sm text-text-muted leading-[1.9] mb-4">
                  命理分析告訴你「你是誰」，出門訣告訴你「怎麼做」。
                  系統根據奇門遁甲精確排算每個時辰的能量方位，套入您的個人命格驗證，
                  找出最適合您出行的吉時與方位——在對的時間，往對的方向走，讓運勢真正改變。
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-dark font-bold rounded-lg btn-glow text-sm">
                    了解出門訣方案
                  </a>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="text-gold">&#10003;</span> 事件出門訣 $119
                    <span className="mx-1">|</span>
                    <span className="text-gold">&#10003;</span> 月盤出門訣 $89
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 創辦人的話 */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">為什麼是鑒源</span>
          </div>

          <div className="glass rounded-2xl p-8 md:p-12">
            <div className="text-gold/60 text-4xl mb-4" style={{ fontFamily: 'var(--font-sans)' }}>&ldquo;</div>

            <div className="space-y-5 text-base text-text leading-[2]">
              <p>
                我是個極度重視邏輯與數據的人。<br />
                身為金融從業者，我做的每一個決定，都需要依據、推理，以及完整的分析。
              </p>

              <p>
                所以，如果有一天我告訴你——命理改變了我的人生軌跡，<br />
                請相信，那不會是一句沒有根據的玄學。
              </p>

              <p>
                30 歲之前，我改過三次名字。<br />
                前兩次，並不是我能選擇的；直到第三次，我決定把人生的方向，握在自己手裡。
              </p>

              <p>
                改名不是一件簡單的事。從證件、銀行到所有資料，每一個細節都必須重新調整。
                也因此，我格外謹慎——找了<strong className="text-cream">六位命理老師</strong>，
                花了將近<strong className="text-cream">三萬多元</strong>，只為了做一件事：<strong className="text-gold">驗證</strong>。
              </p>

              <p>
                但結果，卻讓我開始動搖。
              </p>

              <p>
                每一位老師，都能把名字說得頭頭是道。
                上一位說「很好」，下一位卻說「不行」。標準不一致，答案也沒有終點。
                那一刻我才明白——這些建議的核心，從來不是「適不適合你」，
                而是「讓你再花一次錢」。
              </p>

              <p>
                從台幣 3,600 到 8,000，我都試過。<br />
                最終，我沒有採用任何一位老師的方案。<br />
                因為我開始懷疑的，不只是名字，而是——<strong className="text-cream">我是不是把人生的選擇，交給了別人？</strong>
              </p>

              <p>
                於是我花了兩個多月，閱讀了十多本姓名學專著，研究了六大門派的理論體系，
                最後自己為自己改了名。
              </p>

              <p className="glass rounded-xl p-5 border-l-2 border-gold/30">
                <span className="text-text-muted text-sm">改名前：</span><br />
                23 歲拿到百萬年薪，26 歲負債兩百萬，收入銳減一半，差點破產。
                30 歲還在數著銀行餘額過日子。最好的朋友曾對我說——
                <em className="text-gold/90">「你不是沒有能力，而是真的比較倒楣而已。」</em>
              </p>

              <p className="glass rounded-xl p-5 border-l-2 border-green-600/30">
                <span className="text-text-muted text-sm">改名後：</span><br />
                30 到 35 歲，被挖角到中國、再到香港。遇到了另一半，成了家、生了孩子。
                從負債兩百多萬，到收入翻了數倍，豐衣足食。
              </p>

              <p>
                大概率<strong className="text-cream">八成是因為我夠努力</strong>。
                但總有那關鍵的兩成——運勢、時機、生不逢時——不是努力就能改變的。
              </p>

              <p>
                在我的認知中，命理是經過數理驗算後找出大概率趨勢的一門學問。
                它的目標從來不是逆天改命，而是一個<strong className="text-gold">自我對話的過程</strong>——
                更了解自己，才能更完善地發揮自己的天賦。
              </p>

              <p className="text-cream font-semibold">
                這就是鑒源的初衷。<br />
                回到源頭，看清本質。把選擇的權力，交還給你自己。
              </p>
            </div>

            <div className="text-gold/60 text-4xl text-right mt-4" style={{ fontFamily: 'var(--font-sans)' }}>&rdquo;</div>

            <div className="mt-8 pt-6 border-t border-gold/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center text-gold text-lg font-bold shrink-0" style={{ fontFamily: 'var(--font-sans)' }}>J</div>
                <div>
                  <p className="text-sm font-semibold text-cream">Jamie</p>
                  <p className="text-xs text-gold/70">鑒源創辦人</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 用戶評價 */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">用戶心聲</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-4 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            真實用戶回饋
          </h2>
          <p className="text-center text-text-muted text-sm mb-12">看看他們如何在鑒源的報告中找到答案</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: '陳先生', location: '台北', plan: '人生藍圖', text: '之前花了三千多找老師看八字，結論就兩頁紙。鑒源的報告十幾頁，十五套系統逐一分析，而且每個結論都說明了依據。最關鍵的是大運分析，直接點出了我 37-42 歲是事業黃金期，我正好在猶豫要不要創業。' },
              { name: '王女士', location: '香港', plan: '家族藍圖', text: '幫全家四口人做了分析。我跟老公的合婚分析很精準——報告說我們在財務觀念上容易有摩擦，確實如此。更驚喜的是孩子的天賦分析，報告建議的學習方向跟孩子實際的興趣完全吻合。' },
              { name: '李先生', location: '深圳', plan: '心之所惑', text: '本來半信半疑，先試了免費速算，性格分析準到我懷疑是不是有人偷看我的日記。後來花 $39 買了「心之所惑」問財運，報告不只告訴我運勢走向，還具體建議了投資時機和要避開的月份。' },
              { name: '張小姐', location: '新加坡', plan: '事件出門訣', text: '面試前買了出門訣，系統排了幾百個時辰幫我找最佳出行方案。按照建議在吉時出門，面試當天狀態出奇的好，最後拿到了 offer。不管是巧合還是真的有效，光是那份安心感就值回票價。' },
              { name: '林先生', location: '台中', plan: '合否？', text: '跟女友交往兩年一直在猶豫要不要結婚。「合否？」分析出我們個性互補但溝通方式有衝突，還給了具體的相處建議。我們照著調整後，吵架真的少了很多。下個月要求婚了。' },
              { name: '黃女士', location: '溫哥華', plan: '人生藍圖', text: '移民後一直覺得事業發展不順，報告分析出我的命格其實更適合自由業而不是上班族。裡面還提到我 35 歲後有一步好的事業運，剛好就是我移民之後。現在已經開始籌備自己的工作室了。' },
            ].map((t) => (
              <div key={t.name} className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-gold text-sm">&#9733;</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gold/60 px-2 py-0.5 bg-gold/5 rounded">{t.plan}</span>
                </div>
                <p className="text-sm text-text leading-[1.9] mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-gold text-xs font-bold">{t.name[0]}</div>
                  <div>
                    <div className="text-xs font-semibold text-cream">{t.name}</div>
                    <div className="text-[10px] text-text-muted">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-surface">
        <div className="max-w-3xl mx-auto px-6">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">常見問題</span>
          </div>
          <h2 className="text-2xl md:text-3xl text-center mb-12 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            您可能想知道
          </h2>
          {[
            { q: '鑒源的命理分析準確嗎？', a: '排盤計算使用經過驗證的確定性算法，與專業命理軟體一致。分析解讀基於數十部經典古籍提煉的 34,458 條專業規則，再由 AI 引擎整合出個人化報告。最重要的是，鑒源用十五套系統交叉驗證——當多數系統得出相同結論時，準確度遠高於單一系統的判斷。' },
            { q: '報告多久可以收到？', a: '付款後系統自動開始運算。個人報告（人生藍圖、心之所惑）約 30 分鐘完成；出門訣需排算數百個時辰，約需 40 分鐘以上。完成後會立即寄送 Email 通知，您也可以在儀表板即時查看分析進度。' },
            { q: '需要提供什麼資料？', a: '姓名、出生日期、出生時間（時辰）、性別。出生時間越精確，分析越準確。如果不確定出生時間，可以選擇最接近的時辰，部分不依賴時辰的系統仍可正常分析。' },
            { q: '15套系統會不會互相矛盾？', a: '不同系統觀察的角度不同，偶有差異屬正常。這正是鑒源的核心價值——我們用三層加權架構進行交叉驗證，取各系統共識作為最終結論。單一系統只有一個觀點，十五套系統交叉驗證才能得到更全面、更可靠的結論。' },
            { q: '付款安全嗎？', a: '所有付款透過國際知名的 Stripe 安全系統處理，支援信用卡和各種支付方式。您的信用卡資訊完全由 Stripe 處理，不會經過鑒源伺服器。Stripe 已通過 PCI DSS Level 1 認證，是全球最高等級的支付安全標準。' },
            { q: '可以退款嗎？', a: '報告為虛擬數位內容，一旦開始生成即消耗運算資源，因此生成後不支持退款。如果報告品質有任何問題，請聯繫 support@jianyuan.life，我們會為您免費重新生成，確保您獲得滿意的分析結果。' },
            { q: '什麼是出門訣？', a: '出門訣源自奇門遁甲，是根據特定時辰的能量方位來擇吉出行的方法。系統會排算數百個時辰的奇門局，套入個人命格驗證，找出最適合您的 Top5 吉時與方位。操作簡單：在指定時間出門，往指定方向走，到達後靜待 40 分鐘。整個過程約 70 分鐘，報告附帶 Google Calendar 一鍵新增功能。' },
            { q: '報告是繁體還是簡體？', a: '根據您使用網站時的語言設定自動決定。網站右上角可隨時切換繁簡體，報告會以您選擇的語言版本生成。' },
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
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="divider-ornament text-gold/30 mb-6">
            <span className="text-xs tracking-[0.2em]">開始</span>
          </div>
          <h2 className="text-3xl mb-4 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            知命者不惑，識運者不憂
          </h2>
          <p className="text-text-muted mb-10 leading-[1.9]">
            用 30 秒做一次免費命理速算，<br />
            看看十五套系統如何解讀你的命格密碼。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/tools/bazi"
              className="inline-block px-10 py-4 bg-gold text-dark font-bold rounded-lg text-lg btn-glow">
              免費體驗命理速算
            </a>
            <a href="/pricing"
              className="inline-block px-10 py-4 glass text-cream font-semibold rounded-lg text-lg hover:bg-surface-hover transition-colors">
              直接選擇方案
            </a>
          </div>
          <p className="mt-6 text-xs text-text-muted/60">不需註冊 &middot; 不需信用卡 &middot; 完全免費</p>
        </div>
      </section>
    </div>
  )
}
