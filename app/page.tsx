import PricingCards from '@/components/PricingCards'

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
            <span className="text-cream">回到源頭</span>
            <br />
            <span className="text-gradient-gold">看清本質</span>
          </h1>
          <p className="text-base md:text-lg text-text-muted mb-10 max-w-xl mx-auto leading-[1.9]">
            鑒，金之明鏡，照見萬象。源，水之根本，追溯因果。<br />
            融合東西方十五大命理系統與人工智能，
            為您揭示命格的根源，照見人生的本質。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/tools/bazi"
              className="px-8 py-3.5 bg-gold text-dark font-bold rounded-lg text-base btn-glow inline-flex items-center justify-center gap-2">
              免費命理速算
            </a>
            <a href="/pricing"
              className="px-8 py-3.5 glass text-cream font-semibold rounded-lg text-base hover:bg-surface-hover transition-colors inline-flex items-center justify-center gap-2">
              查看方案定價
            </a>
          </div>
          <p className="mt-6 text-xs text-text-muted/60">不需註冊 &middot; 即時出結果 &middot; 完全免費</p>
        </div>
      </section>

      {/* 信任指標 */}
      <section className="py-14 border-y border-gold/8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '15', label: '命理系統', sub: '東西方完整覆蓋' },
            { num: '34,458', label: '條專業規則', sub: '大師級分析引擎' },
            { num: '數十部', label: '經典古籍', sub: '千年智慧結晶' },
            { num: '11', label: '種方案', sub: '豐儉由人' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-bold text-gradient-gold" style={{ fontFamily: 'var(--font-sans)' }}>{s.num}</div>
              <div className="text-sm text-cream mt-1">{s.label}</div>
              <div className="text-[11px] text-text-muted">{s.sub}</div>
            </div>
          ))}
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
              { step: '貳', title: '選擇方案', desc: '8種方案，從核心三系統到全方位十五系統' },
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
          <p className="text-center text-text-muted mb-12 text-sm">從入門到全面，豐儉由人</p>
          <PricingCards />
          <p className="text-center mt-8 text-sm text-text-muted">
            還有更多方案 &middot; <a href="/pricing" className="text-gold hover:underline">查看全部 11 種</a>
          </p>
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
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">金融從業者 · 命理研究者 · 親身驗證15套系統的實踐者</p>
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
          <h2 className="text-2xl md:text-3xl text-center mb-12 text-cream" style={{ fontFamily: 'var(--font-sans)' }}>
            他們怎麼說
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: '陳先生', location: '台北', text: '15套系統的交叉驗證讓我很信服。八字和紫微的分析非常精準，直接指出了我事業轉型的方向，後來確實應驗了。' },
              { name: '王女士', location: '香港', text: '幫全家人做了家庭全方位方案，合婚分析和親子關係的建議非常實用。尤其是風水佈局的部分，改了之後家裡氛圍好很多。' },
              { name: '李先生', location: '深圳', text: '本來半信半疑，看到免費速算就試了一下，結果性格分析準到起雞皮疙瘩。後來買了C方案，大運分析幫我做了一個重要決定。' },
            ].map((t) => (
              <div key={t.name} className="glass rounded-xl p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-gold text-sm">&#9733;</span>
                  ))}
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
            { q: '報告多久可以收到？', a: '付款後系統自動開始計算和分析，通常 5-15 分鐘內完成。您會收到郵件通知，也可以在線上即時查看。' },
            { q: '需要提供什麼資料？', a: '姓名、出生日期、出生時間（時辰）、性別。如需風水分析，還需提供住址。出生時間越精確，分析越準確。' },
            { q: '不知道出生時間怎麼辦？', a: '可以選擇最接近的時辰。部分不依賴時辰的系統（如生肖、數字能量等）仍可正常分析。' },
            { q: '15套系統會不會互相矛盾？', a: '不同系統觀察的角度不同，偶有差異屬正常。我們用三層加權架構進行交叉驗證，取各系統共識作為最終結論。' },
            { q: '報告是繁體還是簡體？', a: '根據您使用網站時的語言設定自動決定。右上角可隨時切換繁簡體。' },
            { q: '分析準確嗎？', a: '排盤計算使用經過驗證的確定性算法。解讀基於數十部經典古籍提煉的34,458條專業規則，每份報告經過自動品質檢查。' },
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
            從一份免費命理速算開始，<br />
            看看千年古籍智慧如何解讀您的命格密碼。
          </p>
          <a href="/tools/bazi"
            className="inline-block px-10 py-4 bg-gold text-dark font-bold rounded-lg text-lg btn-glow">
            免費命理速算
          </a>
        </div>
      </section>
    </div>
  )
}
