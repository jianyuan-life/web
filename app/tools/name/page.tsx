'use client'

import { useState } from 'react'

const WX_COLORS: Record<string, string> = { '木': '#22c55e', '火': '#ef4444', '土': '#eab308', '金': '#f59e0b', '水': '#3b82f6' }

// 分析步驟動畫
const ANALYSIS_STEPS = [
  { text: '拆解姓名筆畫...', icon: '&#9998;', duration: 600 },
  { text: '計算天格數理...', icon: '&#9737;', duration: 500 },
  { text: '計算人格數理...', icon: '&#9678;', duration: 500 },
  { text: '計算地格數理...', icon: '&#9672;', duration: 500 },
  { text: '計算外格數理...', icon: '&#9734;', duration: 500 },
  { text: '計算總格數理...', icon: '&#9733;', duration: 500 },
  { text: '推算三才配置...', icon: '&#9776;', duration: 600 },
  { text: '判定五行生剋...', icon: '&#10024;', duration: 700 },
  { text: '啟動深度解讀引擎...', icon: '&#129302;', duration: 800 },
  { text: '生成姓名分析報告...', icon: '&#128221;', duration: 1000 },
]

type GeResult = {
  value: number
  wuxing: string
  level: string
  desc: string
}

type NameResult = {
  fullName: string
  surname: string
  givenName: string
  surnameStrokes: number[]
  givenStrokes: number[]
  tiange: GeResult
  renge: GeResult
  dige: GeResult
  waige: GeResult
  zongge: GeResult
  sancai: { tian: string; ren: string; di: string; config: string }
  totalScore: number
  aiAnalysis: string
  hasAi: boolean
}

const LEVEL_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  '大吉': { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  '吉': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  '凶帶吉': { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  '凶': { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
}

export default function NameToolPage() {
  const [form, setForm] = useState({
    surname: '', givenName: '', gender: 'M',
    year: '1990', month: '1', day: '1',
  })
  const [result, setResult] = useState<NameResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.surname.trim() || !form.givenName.trim()) { setError('請輸入姓和名'); return }
    setLoading(true); setError(''); setResult(null)
    setCurrentStep(0); setCompletedSteps([])

    let stepIdx = 0
    const stepInterval = setInterval(() => {
      if (stepIdx < ANALYSIS_STEPS.length) {
        setCompletedSteps(prev => [...prev, stepIdx])
        stepIdx++
        setCurrentStep(stepIdx)
      }
    }, ANALYSIS_STEPS[Math.min(stepIdx, ANALYSIS_STEPS.length - 1)]?.duration || 600)

    try {
      const res = await fetch('/api/free-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname: form.surname, givenName: form.givenName,
          gender: form.gender,
          year: parseInt(form.year), month: parseInt(form.month), day: parseInt(form.day),
        }),
      })
      clearInterval(stepInterval)
      setCompletedSteps(ANALYSIS_STEPS.map((_, i) => i))
      setCurrentStep(ANALYSIS_STEPS.length)

      if (!res.ok) throw new Error((await res.json()).detail || '分析失敗')
      await new Promise(r => setTimeout(r, 500))
      setResult(await res.json())
    } catch (err: unknown) {
      clearInterval(stepInterval)
      setError(err instanceof Error ? err.message : '分析失敗')
    } finally { setLoading(false) }
  }

  // 評分環形圖
  const ScoreRing = ({ score }: { score: number }) => {
    const r = 54, c = 2 * Math.PI * r
    const offset = c - (score / 100) * c
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'
    return (
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 70 70)" className="transition-all duration-1000" />
        <text x="70" y="64" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">{score}</text>
        <text x="70" y="84" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12">/ 100</text>
      </svg>
    )
  }

  return (
    <div className="py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-gradient-gold">姓名學速算</span>
        </h1>
        <p className="text-center text-text-muted mb-2">五格剖象法 + 三才配置 + 數理吉凶分析</p>
        <p className="text-center text-xs text-text-muted/60 mb-4">不需註冊 &middot; 即時出結果 &middot; 完全免費</p>

        {/* 姓名學由來與說明 */}
        <div className="max-w-2xl mx-auto mb-10">
          <details className="glass rounded-xl p-4 cursor-pointer">
            <summary className="text-sm font-medium text-gold-400 flex items-center gap-2">
              <span>&#128218;</span> 關於姓名學：為什麼用康熙字典筆畫？
            </summary>
            <div className="mt-3 text-xs text-text-muted/80 space-y-2 leading-relaxed">
              <p><strong className="text-white/90">姓名學的由來：</strong>五格剖象法由日本學者熊崎健翁於 1918 年創立，後傳入華人世界並與中國傳統數理、五行學說結合，成為目前最廣泛使用的姓名分析方法。透過姓名的筆畫數，計算出天格、人格、地格、外格、總格五格數理，搭配八十一靈動數與三才配置，推算姓名的吉凶能量。</p>
              <p><strong className="text-white/90">為什麼必須用繁體字（康熙字典）計算？</strong>姓名學的數理基礎建立在《康熙字典》的筆畫標準之上，而非現代簡化字。康熙字典成書於 1716 年，是中國歷史上最權威的字典，其筆畫系統基於 214 個部首的完整字形。簡化字改變了許多字的筆畫數（例如「張」簡體7畫、繁體11畫；「陳」簡體7畫、繁體16畫），若用簡體計算將導致五格數理完全錯誤。</p>
              <p><strong className="text-white/90">鑒源的做法：</strong>本系統採用 Unicode 官方 Unihan 數據庫（涵蓋 102,998 個漢字），以 214 個康熙部首的標準筆畫為基礎計算。無論您輸入繁體或簡體，系統都會自動轉換為繁體字後再進行筆畫查詢，確保結果準確無誤。</p>
            </div>
          </details>
        </div>

        {/* 分析進度動畫 */}
        {loading && !result && (
          <div className="max-w-lg mx-auto">
            <div className="glass rounded-2xl p-8">
              <h3 className="text-lg font-bold text-cream mb-6 text-center" style={{ fontFamily: 'var(--font-sans)' }}>
                正在分析「<span className="text-gold">{form.surname}{form.givenName}</span>」的姓名能量
              </h3>
              <div className="space-y-2">
                {ANALYSIS_STEPS.map((step, i) => {
                  const isCompleted = completedSteps.includes(i)
                  const isCurrent = currentStep === i
                  return (
                    <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300 ${
                      isCompleted ? 'bg-gold/10' : isCurrent ? 'bg-gold/5' : 'opacity-30'
                    }`}>
                      <span className={`w-6 text-center text-sm transition-all ${isCompleted ? 'text-gold' : isCurrent ? 'text-gold/70 animate-pulse' : 'text-text-muted/40'}`}
                        dangerouslySetInnerHTML={{ __html: isCompleted ? '&#10003;' : step.icon }} />
                      <span className={`text-sm transition-all ${isCompleted ? 'text-cream' : isCurrent ? 'text-text animate-pulse' : 'text-text-muted/40'}`}>
                        {step.text}
                      </span>
                      {isCurrent && <span className="ml-auto w-4 h-4 border-2 border-gold/50 border-t-gold rounded-full animate-spin" />}
                      {isCompleted && <span className="ml-auto text-xs text-gold/60">完成</span>}
                    </div>
                  )
                })}
              </div>
              {currentStep >= ANALYSIS_STEPS.length && (
                <p className="text-center text-gold mt-6 animate-pulse text-sm">分析完畢，正在載入...</p>
              )}
            </div>
          </div>
        )}

        {/* 表單 */}
        {!result && !loading && (
          <div className="max-w-lg mx-auto">
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
              {/* 姓 + 名 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">姓氏 <span className="text-red-accent">*</span></label>
                  <input type="text" required placeholder="例：王" value={form.surname}
                    onChange={(e) => setForm({ ...form, surname: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-3 text-cream text-base focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">名字 <span className="text-red-accent">*</span></label>
                  <input type="text" required placeholder="例：大明" value={form.givenName}
                    onChange={(e) => setForm({ ...form, givenName: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-3 text-cream text-base focus:border-gold/40 focus:outline-none" />
                </div>
              </div>

              {/* 性別 */}
              <div>
                <label className="block text-sm text-text-muted mb-1.5">性別</label>
                <div className="flex gap-6">
                  {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="accent-gold" />
                      <span className="text-base text-text">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 出生日期（用於結合八字分析） */}
              <div>
                <label className="block text-sm text-text-muted mb-1.5">出生日期 <span className="text-text-muted/50">（選填，可提供更精準分析）</span></label>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" min="1920" max="2025" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none" placeholder="年" />
                  <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
                  </select>
                  <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                    {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50">
                開始姓名分析
              </button>
              {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
            </form>

            {/* 說明 */}
            <div className="mt-6 glass rounded-xl p-5 text-sm text-text-muted leading-relaxed">
              <p className="font-semibold text-cream mb-2">什麼是五格剖象法？</p>
              <p>
                五格剖象法是日本熊崎健翁氏所創，根據姓名的康熙筆畫數計算天格、人格、地格、外格、總格五個數理，
                再配合三才（天、人、地）的五行生剋關係，推斷姓名對人生各方面的影響。
                其中<strong className="text-cream">人格</strong>反映內在性格，<strong className="text-cream">總格</strong>反映一生運勢。
              </p>
            </div>
          </div>
        )}

        {/* 結果 */}
        {result && (
          <div className="space-y-8">
            <div className="text-center">
              <button onClick={() => setResult(null)} className="text-sm text-gold hover:underline">&larr; 重新分析</button>
            </div>

            {/* 綜合評分 */}
            <div className="glass rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-gold/20 text-gold text-sm font-semibold mb-3">
                  姓名能量分析
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">「{result.fullName}」</h2>
                <div className="flex justify-center mb-4">
                  <ScoreRing score={result.totalScore} />
                </div>
                <p className="text-sm text-text-muted">
                  綜合評分 &middot; 三才配置：
                  <span style={{ color: WX_COLORS[result.sancai.tian] }}>{result.sancai.tian}</span>
                  <span style={{ color: WX_COLORS[result.sancai.ren] }}>{result.sancai.ren}</span>
                  <span style={{ color: WX_COLORS[result.sancai.di] }}>{result.sancai.di}</span>
                </p>
              </div>

              {/* 筆畫拆解 */}
              <div className="flex justify-center gap-4 mb-6">
                {[...result.surname].map((char, i) => (
                  <div key={`s-${i}`} className="text-center">
                    <div className="text-3xl font-bold text-gold mb-1">{char}</div>
                    <div className="text-xs text-text-muted">{result.surnameStrokes[i]} 畫</div>
                  </div>
                ))}
                {[...result.givenName].map((char, i) => (
                  <div key={`g-${i}`} className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">{char}</div>
                    <div className="text-xs text-text-muted">{result.givenStrokes[i]} 畫</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 五格數理 */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 bg-gold rounded-full" />
                <h2 className="text-lg font-bold text-white">五格數理分析</h2>
              </div>
              <div className="space-y-3">
                {[
                  { name: '天格', data: result.tiange, desc: '先天運勢（由姓氏決定，不可改）' },
                  { name: '人格', data: result.renge, desc: '性格與人際（最重要的格數）' },
                  { name: '地格', data: result.dige, desc: '前運與基礎（36歲前影響最大）' },
                  { name: '外格', data: result.waige, desc: '社交與外在助力' },
                  { name: '總格', data: result.zongge, desc: '後運與一生總結（36歲後影響最大）' },
                ].map(({ name, data, desc }) => {
                  const lc = LEVEL_COLORS[data.level] || LEVEL_COLORS['凶']
                  return (
                    <div key={name} className={`rounded-xl border p-4 ${lc.border} ${lc.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-white">{name}</span>
                          <span className="text-sm text-text-muted">{data.value}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: WX_COLORS[data.wuxing], background: `${WX_COLORS[data.wuxing]}20` }}>
                            {data.wuxing}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${lc.text}`}>{data.level}</span>
                      </div>
                      <p className="text-xs text-text-muted mb-1">{desc}</p>
                      <p className="text-sm text-text leading-relaxed">{data.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 三才配置 */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                <h2 className="text-lg font-bold text-cream">三才配置</h2>
              </div>
              <div className="flex items-center justify-center gap-6 mb-4">
                {[
                  { label: '天', wx: result.sancai.tian },
                  { label: '人', wx: result.sancai.ren },
                  { label: '地', wx: result.sancai.di },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center mb-2"
                      style={{ borderColor: WX_COLORS[item.wx], background: `${WX_COLORS[item.wx]}15` }}>
                      <span className="text-2xl font-bold" style={{ color: WX_COLORS[item.wx] }}>{item.wx}</span>
                    </div>
                    <div className="text-xs text-text-muted">{item.label}格</div>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-text-muted">
                三才配置「{result.sancai.config}」代表天時、人和、地利三者的五行關係，
                影響健康、人際、成功等方面。
              </p>
            </div>

            {/* AI 深度解讀 */}
            {result.hasAi && result.aiAnalysis && (
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gold rounded-full" />
                  <h2 className="text-lg font-bold text-cream">姓名深度解讀</h2>
                </div>
                <p className="text-base text-text leading-[2] whitespace-pre-line">{result.aiAnalysis}</p>
              </div>
            )}

            {/* 升級引導 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(184,134,11,0.12), rgba(26,58,92,0.4))' }}>
              <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    姓名學只是 15 套系統中的 <span className="text-gradient-gold">1 套</span>
                  </h3>
                  <p className="text-base text-text max-w-2xl mx-auto leading-relaxed">
                    姓名是先天命格的一部分，但真正影響人生的還有<strong className="text-white">八字、紫微斗數、奇門遁甲</strong>等。
                    完整報告融合 15 套東西方命理體系，多維度交叉驗證，給您最全面的命格分析。
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                    {(['C', 'D'] as const).map((plan, idx) => {
                      const q = new URLSearchParams({
                        plan,
                        name: form.surname + form.givenName,
                        year: form.year,
                        month: form.month,
                        day: form.day,
                        gender: form.gender,
                      })
                      const label = idx === 0 ? '解鎖人生藍圖完整報告 $89' : '聚焦單一困惑深度分析 $39'
                      const cls = idx === 0
                        ? 'px-10 py-4 bg-gold text-dark font-bold rounded-xl text-lg btn-glow'
                        : 'px-10 py-4 glass text-white font-semibold rounded-xl text-lg hover:bg-white/10'
                      return <a key={plan} href={`/checkout?${q}`} className={cls}>{label}</a>
                    })}
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted/60">
                    <span>&#128274; Stripe 安全支付</span>
                    <span>&#9889; 5 分鐘出報告</span>
                    <span>&#128230; PDF 永久保存</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
