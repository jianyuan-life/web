'use client'

import { useState } from 'react'

// MVP: 模擬報告數據（後續從 Supabase 讀取）
const MOCK_ANALYSES = [
  { system: '八字命理', tier: 1, score: 82, icon: '&#x2630;',
    good: ['日主庚金坐戌土，得月令生扶，根基穩固', '食傷洩秀格局，才華橫溢，適合創意與表達領域', '大運走水木運，財運持續上升'],
    bad: ['火土過旺，金水不足，容易壓力過大', '偏財格局需防投資衝動', '官殺混雜，職場人際需謹慎'],
    warnings: ['2026丙午年火旺，注意心血管健康', '農曆七月沖太歲，重大決策宜緩'],
    improvements: ['佩戴白色/銀色飾品補金氣', '辦公桌擺放北方（水位）增貴人運', '每日亥時（21-23點）靜坐冥想15分鐘'],
  },
  { system: '紫微斗數', tier: 1, score: 85, icon: '&#9733;',
    good: ['天府坐命，穩重大器，財庫豐盈', '武曲化科入財帛宮，正財運極佳', '左輔右弼夾命，貴人運旺'],
    bad: ['廉貞化忌入遷移宮，外出奔波勞碌', '天相受制，合作關係需慎選', '田宅宮煞星匯聚，不動產投資宜保守'],
    warnings: ['大限走到巳宮，事業大變動期', '流年四化重疊，年底前完成重要決策'],
    improvements: ['善用天府穩健特質，以守為攻', '年底前確認重要合約和投資方向', '家中西北方擺放金屬器皿增財運'],
  },
  { system: '奇門遁甲', tier: 1, score: 79, icon: '&#9782;',
    good: ['值符落宮得位，整體運勢穩定', '開門臨六合，人際合作順利', '天輔星加持，學習進修效果顯著'],
    bad: ['驛馬入空亡，出差/搬遷宜延後', '白虎當頭，防口舌是非', '景門受制，名聲聲譽需維護'],
    warnings: ['農曆三月壬辰月是關鍵月份', '避免在死門方位（西南）談判簽約'],
    improvements: ['每月挑選吉時出門沐吉氣，補充正能量', '辦公室門朝開門方位（東北）', '重要會議選在休門時段'],
  },
  { system: '風水堪輿', tier: 2, score: 76, icon: '&#127968;',
    good: ['命卦離九宮，南方為生氣位', '九運當運，離火正旺', '住宅坐北朝南格局合宜'],
    bad: ['五黃煞飛臨中宮，全年需化解', '二黑病符星入臥室方位', '大門朝向與年飛星有沖'],
    warnings: ['西南方今年不宜動土裝修', '廚房火位需檢查是否犯煞'],
    improvements: ['大門處掛銅葫蘆化五黃煞', '臥室放置白水晶柱化二黑', '客廳東南方放綠色植物催旺文昌'],
  },
  { system: '西洋占星', tier: 2, score: 80, icon: '&#9790;',
    good: ['太陽天秤座，社交魅力與平衡感俱佳', '月亮落入水象星座，情感直覺敏銳', '金星入廟，愛情和審美能力突出'],
    bad: ['土星刑相位帶來事業壓力', '海王星對沖，防被騙或理想化', '火星逆行期間行動力受阻'],
    warnings: ['木星入雙子座（2025-2026），溝通和學習是關鍵主題', '日蝕影響第七宮，合作關係大洗牌'],
    improvements: ['善用天秤座的協調能力處理職場關係', '金星時段（週五）適合談判簽約', '避開火星逆行期的重大決策'],
  },
]

export default function ReportPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const avgScore = Math.round(MOCK_ANALYSES.reduce((s, a) => s + a.score, 0) / MOCK_ANALYSES.length)

  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* 報告頭部 */}
        <div className="glass rounded-2xl p-8 mb-8 text-center">
          <div className="text-xs text-gold font-mono mb-2">全方位命格分析報告</div>
          <h1 className="text-3xl font-bold text-white mb-1">何宣逸</h1>
          <p className="text-sm text-text-muted">1990年10月12日 戌時 | 男</p>
          <div className="mt-6 inline-flex items-center gap-3">
            <div className="text-5xl font-extrabold text-gradient-gold">{avgScore}</div>
            <div className="text-left">
              <div className="text-sm text-text-muted">綜合評分</div>
              <div className="text-xs text-text-muted/60">{MOCK_ANALYSES.length} 系統平均</div>
            </div>
          </div>
        </div>

        {/* 系統評分一覽 */}
        <div className="glass rounded-xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-text-muted mb-4">各系統評分</h3>
          <div className="space-y-3">
            {MOCK_ANALYSES.map((a) => (
              <div key={a.system} className="flex items-center gap-3">
                <span className="w-20 text-xs text-text truncate">{a.system}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${a.score}%`,
                      background: a.score >= 85 ? '#22c55e' : a.score >= 75 ? '#b8860b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="w-8 text-xs text-right font-semibold text-white">{a.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 各系統詳細分析 */}
        <div className="space-y-4">
          {MOCK_ANALYSES.map((analysis) => (
            <div key={analysis.system} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === analysis.system ? null : analysis.system)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xl ${analysis.tier === 1 ? 'text-gold' : 'text-blue-400'}`}
                    dangerouslySetInnerHTML={{ __html: analysis.icon }}
                  />
                  <div>
                    <h3 className="font-semibold text-white">{analysis.system}</h3>
                    <div className="flex gap-2 mt-0.5">
                      {analysis.tier === 1 && <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 text-gold rounded-full">核心</span>}
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-text-muted rounded-full">{analysis.score}分</span>
                    </div>
                  </div>
                </div>
                <span className={`text-gold transition-transform ${expanded === analysis.system ? 'rotate-180' : ''}`}>
                  &#9660;
                </span>
              </button>

              {expanded === analysis.system && (
                <div className="px-5 pb-5 space-y-4">
                  {/* 好的 */}
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-2">&#10003; 好的方面</h4>
                    <ul className="space-y-1.5">
                      {analysis.good.map((g, i) => (
                        <li key={i} className="text-xs text-text leading-relaxed pl-3 border-l-2 border-green-500/30">{g}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 不好的 */}
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">&#9888; 需注意的地方</h4>
                    <ul className="space-y-1.5">
                      {analysis.bad.map((b, i) => (
                        <li key={i} className="text-xs text-text leading-relaxed pl-3 border-l-2 border-red-500/30">{b}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 注意 */}
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">&#128204; 特別提醒</h4>
                    <ul className="space-y-1.5">
                      {analysis.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-text leading-relaxed pl-3 border-l-2 border-yellow-500/30">{w}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 改善 */}
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">&#128736; 改善方案</h4>
                    <ul className="space-y-1.5">
                      {analysis.improvements.map((imp, i) => (
                        <li key={i} className="text-xs text-text leading-relaxed pl-3 border-l-2 border-blue-500/30">{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="mt-8 glass rounded-xl p-5 flex items-center justify-between">
          <div className="text-sm text-text-muted">
            報告生成時間：2026-03-31 | {MOCK_ANALYSES.length} 套系統
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 glass rounded-lg text-sm text-white hover:bg-white/10">
              分享報告
            </button>
            <a href="#" className="px-4 py-2 bg-gold text-dark font-semibold rounded-lg text-sm btn-glow">
              下載 PDF
            </a>
          </div>
        </div>

        {/* 免責聲明 */}
        <p className="text-center text-xs text-text-muted/40 mt-8">
          本報告僅供參考和娛樂用途，不構成任何醫療、投資或法律建議。
        </p>
      </div>
    </div>
  )
}
