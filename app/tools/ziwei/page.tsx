'use client'

import { useState } from 'react'
import { searchCities, searchLocations, type LocationSearchResult } from '@/lib/cities'
import FamilyMemberPicker from '@/components/checkout/FamilyMemberPicker'
import type { SavedFamilyMember } from '@/components/FamilyMembersManager'

const SHICHEN = [
  { label: '子時 (23:00-01:00)', value: 0 }, { label: '丑時 (01:00-03:00)', value: 2 },
  { label: '寅時 (03:00-05:00)', value: 4 }, { label: '卯時 (05:00-07:00)', value: 6 },
  { label: '辰時 (07:00-09:00)', value: 8 }, { label: '巳時 (09:00-11:00)', value: 10 },
  { label: '午時 (11:00-13:00)', value: 12 }, { label: '未時 (13:00-15:00)', value: 14 },
  { label: '申時 (15:00-17:00)', value: 16 }, { label: '酉時 (17:00-19:00)', value: 18 },
  { label: '戌時 (19:00-21:00)', value: 20 }, { label: '亥時 (21:00-23:00)', value: 22 },
]

// 分析步驟動畫
const ANALYSIS_STEPS = [
  { text: '計算命宮位置...', icon: '&#9776;', duration: 700 },
  { text: '安紫微星系...', icon: '&#9733;', duration: 600 },
  { text: '安天府星系...', icon: '&#9734;', duration: 600 },
  { text: '排列十二宮位...', icon: '&#9678;', duration: 800 },
  { text: '推算四化飛星...', icon: '&#10024;', duration: 700 },
  { text: '計算五行局...', icon: '&#9672;', duration: 500 },
  { text: '分析命宮三方四正...', icon: '&#9737;', duration: 600 },
  { text: '判定命格高低...', icon: '&#9878;', duration: 500 },
  { text: '啟動深度解讀引擎...', icon: '&#129302;', duration: 800 },
  { text: '生成專屬命盤報告...', icon: '&#128221;', duration: 1000 },
]

type ZiweiResult = {
  mainStar: string
  starNature: string
  starTitle: string
  personality: string
  strengths: string
  challenges: string
  career: string
  love: string
  health: string
  lucky: string
  year2026: string
  palaceData: Record<string, { branch: string; mainStars: string; minorStars: string }>
  sihua: string[]
  yearTG: string
  wuxingju: number
  aiAnalysis: string
  hasAi: boolean
}

const PALACE_COLORS: Record<string, string> = {
  '命宮': 'border-gold/30 bg-gold/[0.06]',
  '財帛宮': 'border-green-500/20 bg-green-500/[0.04]',
  '事業宮': 'border-blue-500/20 bg-blue-500/[0.04]',
  '夫妻宮': 'border-pink-500/20 bg-pink-500/[0.04]',
  '福德宮': 'border-purple-500/20 bg-purple-500/[0.04]',
  '遷移宮': 'border-cyan-500/20 bg-cyan-500/[0.04]',
  '子女宮': 'border-orange-500/20 bg-orange-500/[0.04]',
  '兄弟宮': 'border-teal-500/20 bg-teal-500/[0.04]',
  '疾厄宮': 'border-red-500/20 bg-red-500/[0.04]',
  '交友宮': 'border-indigo-500/20 bg-indigo-500/[0.04]',
  '田宅宮': 'border-amber-500/20 bg-amber-500/[0.04]',
  '父母宮': 'border-rose-500/20 bg-rose-500/[0.04]',
}

// 十二宮位說明
const PALACE_DESC: Record<string, string> = {
  '命宮': '先天性格與命運格局',
  '兄弟宮': '兄弟姐妹緣分與合作關係',
  '夫妻宮': '感情婚姻與伴侶特質',
  '子女宮': '子女緣分與親子關係',
  '財帛宮': '財運與理財能力',
  '疾厄宮': '健康狀況與體質',
  '遷移宮': '外出運與社會際遇',
  '交友宮': '人際關係與部下緣',
  '事業宮': '事業格局與職業方向',
  '田宅宮': '不動產運與家庭環境',
  '福德宮': '精神生活與享受',
  '父母宮': '與父母長輩的關係',
}

// 十二宮位標準順序
const PALACE_ORDER = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮', '遷移宮', '交友宮', '事業宮', '田宅宮', '福德宮', '父母宮']

export default function ZiweiToolPage() {
  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '12', gender: 'M',
    calendarType: 'solar' as 'solar' | 'lunar',
    timeMode: 'shichen' as 'unknown' | 'shichen' | 'exact',
    exactHour: '12', exactMinute: '0',
    city: '', cityLat: 0, cityLng: 0, cityTz: 8,
  })
  const [cityResults, setCityResults] = useState<LocationSearchResult[]>([])
  const [needCityForCountry, setNeedCityForCountry] = useState('')
  const [result, setResult] = useState<ZiweiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  // 從家人選擇後自動填入表單
  const handleFamilySelect = (member: SavedFamilyMember) => {
    const hourVal = member.time_mode === 'exact' ? String(member.hour) : String(Math.floor(member.hour / 2) * 2)
    setForm({
      ...form,
      name: member.name,
      gender: member.gender,
      year: String(member.year),
      month: String(member.month),
      day: String(member.day),
      hour: hourVal,
      timeMode: member.time_mode as 'unknown' | 'shichen' | 'exact',
      exactHour: String(member.hour),
      exactMinute: String(member.minute),
      calendarType: (member.calendar_type || 'solar') as 'solar' | 'lunar',
      city: member.birth_city || '',
      cityLat: member.city_lat || 0,
      cityLng: member.city_lng || 0,
      cityTz: member.city_tz || 8,
    })
    setCityResults([])
    setNeedCityForCountry('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('請輸入姓名'); return }
    if (!form.city.trim() || form.cityLat === 0) { setError('請選擇出生地區'); return }
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
      const res = await fetch('/api/free-ziwei', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(form.year), month: parseInt(form.month), day: parseInt(form.day),
          hour: form.timeMode === 'exact' ? parseInt(form.exactHour) : form.timeMode === 'shichen' ? parseInt(form.hour) : 12,
          gender: form.gender, name: form.name,
          calendar_type: form.calendarType,
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

  return (
    <div className="py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-gradient-gold">紫微斗數速算</span>
        </h1>
        <p className="text-center text-text-muted mb-2">排列紫微命盤 + 十四主星解讀 + 十二宮位分析</p>
        <p className="text-center text-xs text-text-muted/60 mb-4">不需註冊 &middot; 即時出結果 &middot; 完全免費</p>

        {/* 紫微斗數由來說明 */}
        <div className="max-w-2xl mx-auto mb-10">
          <details className="glass rounded-xl p-4 cursor-pointer">
            <summary className="text-sm font-medium text-gold-400 flex items-center gap-2">
              <span>&#128218;</span> 關於紫微斗數：帝王之學
            </summary>
            <div className="mt-3 text-xs text-text-muted/80 space-y-2 leading-relaxed">
              <p><strong className="text-white/90">紫微斗數的由來：</strong>紫微斗數相傳由宋代陳希夷（陳摶老祖）所創，是中國命理學中最精密的推命術之一，素有「帝王之學」的美譽。其名來自紫微星——北極星，古人認為它是天帝的居所，統領群星，因此紫微斗數以紫微星為核心，佈列十四主星於十二宮位，形成每個人獨一無二的命盤。</p>
              <p><strong className="text-white/90">核心原理：</strong>紫微斗數以農曆出生年月日時為基礎，將 108 顆星曜按照特定規則排入十二宮位（命宮、兄弟、夫妻、子女、財帛、疾厄、遷移、交友、事業、田宅、福德、父母），每顆星有廟旺利陷四種狀態，再搭配四化飛星（化祿、化權、化科、化忌）的流轉，推演一生各面向的吉凶起伏。</p>
              <p><strong className="text-white/90">鑒源的做法：</strong>本系統精確計算紫微星的安星起始位置，完整排列十四主星與輔星，並逐宮分析星曜組合的意涵。支援農曆／國曆輸入，閏月自動處理，確保命盤排列的準確性。</p>
            </div>
          </details>
        </div>

        {/* 分析進度動畫 */}
        {loading && !result && (
          <div className="max-w-lg mx-auto">
            <div className="glass rounded-2xl p-8">
              <h3 className="text-lg font-bold text-cream mb-6 text-center" style={{ fontFamily: 'var(--font-sans)' }}>
                正在為 <span className="text-gold">{form.name}</span> 排列紫微命盤
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
                <p className="text-center text-gold mt-6 animate-pulse text-sm">命盤排列完畢，正在載入...</p>
              )}
            </div>
          </div>
        )}

        {/* 表單 */}
        {!result && !loading && (
          <div className="max-w-lg mx-auto">
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
              {/* 從家人選擇 */}
              <FamilyMemberPicker onSelect={handleFamilySelect} />

              {/* 姓名 + 性別 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-text-muted mb-1.5">姓名 <span className="text-red-accent">*</span></label>
                  <input type="text" required placeholder="請輸入您的全名" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-3 text-cream text-base focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">性別</label>
                  <div className="flex gap-4 pt-2">
                    {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="accent-gold" />
                        <span className="text-base text-text">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 出生地區 */}
              <div className="relative">
                <label className="block text-sm text-text-muted mb-1.5">出生地區 <span className="text-red-accent">*</span></label>
                {needCityForCountry && (
                  <p className="text-xs text-gold/80 mb-1.5">已選擇「{needCityForCountry}」（多時區），請輸入城市名</p>
                )}
                <input type="text" placeholder={needCityForCountry ? `輸入${needCityForCountry}的城市名` : '輸入地區名（如：台灣、香港、日本）'} value={form.city}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm({...form, city: val})
                    if (needCityForCountry) {
                      const cities = searchCities(val).filter(c => c.country === needCityForCountry || c.name.includes(val) || c.name_en.toLowerCase().includes(val.toLowerCase()))
                      setCityResults(cities.map(c => ({ type: 'city' as const, city: c })))
                    } else {
                      setCityResults(val.length >= 1 ? searchLocations(val) : [])
                    }
                  }}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-3 text-cream text-base focus:border-gold/40 focus:outline-none" />
                {cityResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 glass rounded-lg border border-gold/20 max-h-48 overflow-y-auto">
                    {cityResults.map((r, idx) => r.type === 'country' ? (
                      <button key={`country-${r.country.name}`} type="button"
                        onClick={() => {
                          if (r.isMultiTz) {
                            setNeedCityForCountry(r.country.name)
                            setForm({...form, city: ''})
                            setCityResults([])
                          } else {
                            setForm({...form, city: r.country.name, cityLat: r.country.lat, cityLng: r.country.lng, cityTz: r.country.tz})
                            setCityResults([])
                            setNeedCityForCountry('')
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gold/10 transition-colors flex justify-between items-center">
                        <span className="text-sm text-cream">{r.country.name}</span>
                        <span className="text-[10px] text-text-muted/60">
                          {r.isMultiTz ? '多時區，請選擇城市' : `UTC${r.country.tz >= 0 ? '+' : ''}${r.country.tz}`}
                        </span>
                      </button>
                    ) : (
                      <button key={`city-${r.city.name_en}-${idx}`} type="button"
                        onClick={() => {
                          setForm({...form, city: `${r.city.name}（${r.city.country}）`, cityLat: r.city.lat, cityLng: r.city.lng, cityTz: r.city.tz})
                          setCityResults([])
                          setNeedCityForCountry('')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gold/10 transition-colors flex justify-between items-center">
                        <span className="text-sm text-cream">{r.city.name} <span className="text-text-muted">({r.city.country})</span></span>
                        <span className="text-[10px] text-text-muted/60">UTC{r.city.tz >= 0 ? '+' : ''}{r.city.tz}</span>
                      </button>
                    ))}
                  </div>
                )}
                {needCityForCountry && (
                  <button type="button" onClick={() => { setNeedCityForCountry(''); setForm({...form, city: ''}); setCityResults([]) }}
                    className="text-xs text-gold/60 hover:text-gold mt-1 underline">取消，重新選擇國家</button>
                )}
                {form.cityLat !== 0 && (
                  <p className="text-[10px] text-text-muted/50 mt-1">經度 {form.cityLng.toFixed(2)}° | 時區 UTC{form.cityTz >= 0 ? '+' : ''}{form.cityTz}</p>
                )}
              </div>

              {/* 國曆/農曆 */}
              <div>
                <label className="block text-sm text-text-muted mb-1.5">曆法</label>
                <div className="flex rounded-lg overflow-hidden border border-gold/10">
                  {[{ v: 'solar' as const, l: '國曆（西曆）' }, { v: 'lunar' as const, l: '農曆' }].map(({ v, l }) => (
                    <button key={v} type="button"
                      onClick={() => setForm({ ...form, calendarType: v })}
                      className={`flex-1 py-2.5 text-sm font-medium transition-all ${form.calendarType === v ? 'bg-gold/20 text-gold' : 'bg-white/3 text-text-muted hover:bg-white/5'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {form.calendarType === 'lunar' && (
                  <p className="text-xs text-gold/60 mt-1.5">系統將自動轉換為國曆進行排盤計算</p>
                )}
              </div>

              {/* 出生日期 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">出生年</label>
                  <input type="number" min="1920" max="2025" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">{form.calendarType === 'lunar' ? '農曆月' : '月'}</label>
                  <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{form.calendarType === 'lunar' ? `${['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'][i]}月` : `${i + 1}月`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">{form.calendarType === 'lunar' ? '農曆日' : '日'}</label>
                  <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                    {Array.from({ length: 30 }, (_, i) => <option key={i + 1} value={i + 1}>{form.calendarType === 'lunar' ? `${['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'][i]}` : `${i + 1}日`}</option>)}
                  </select>
                </div>
              </div>

              {/* 出生時間 */}
              <div>
                <label className="block text-sm text-text-muted mb-1.5">出生時間</label>
                <div className="flex rounded-lg overflow-hidden border border-gold/10 mb-3">
                  {[
                    { v: 'unknown' as const, l: '不確定' },
                    { v: 'shichen' as const, l: '知道時辰' },
                    { v: 'exact' as const, l: '知道精確時間' },
                  ].map(({ v, l }) => (
                    <button key={v} type="button"
                      onClick={() => setForm({ ...form, timeMode: v })}
                      className={`flex-1 py-2.5 text-xs font-medium transition-all ${form.timeMode === v ? 'bg-gold/20 text-gold' : 'bg-white/3 text-text-muted hover:bg-white/5'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {form.timeMode === 'unknown' && (
                  <p className="text-xs text-text-muted/70 leading-relaxed">
                    紫微斗數高度依賴出生時辰，不確定時辰會影響命宮主星判定。
                    <span className="text-gold/70"> 強烈建議確認出生時間以獲得準確的紫微命盤。</span>
                  </p>
                )}
                {form.timeMode === 'shichen' && (
                  <select value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                    {SHICHEN.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                )}
                {form.timeMode === 'exact' && (
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.exactHour} onChange={(e) => setForm({ ...form, exactHour: e.target.value })}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')} 時</option>)}
                    </select>
                    <select value={form.exactMinute} onChange={(e) => setForm({ ...form, exactMinute: e.target.value })}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-3 text-cream text-base focus:border-gold/40 focus:outline-none">
                      {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')} 分</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading || !form.name.trim() || form.cityLat === 0}
                className={`w-full py-4 font-bold rounded-xl text-lg transition-all ${
                  form.name.trim() && form.cityLat !== 0
                    ? 'bg-gold text-dark btn-glow disabled:opacity-50'
                    : 'bg-white/10 text-text-muted cursor-not-allowed'
                }`}>
                開始紫微排盤
              </button>
              {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
            </form>
          </div>
        )}

        {/* 結果 */}
        {result && (
          <div className="space-y-8">
            <div className="text-center">
              <button onClick={() => setResult(null)} className="text-sm text-gold hover:underline">&larr; 重新排盤</button>
            </div>

            {/* 命宮主星 — 人格封號 */}
            <div className="glass rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="inline-block px-4 py-1.5 rounded-full bg-gold/20 text-gold text-sm font-semibold mb-3">
                  {form.name} 的紫微命盤
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  您是「<span className="text-gradient-gold">{result.starTitle}</span>」型人格
                </h2>
                <p className="text-sm text-text-muted">
                  命宮主星：{result.mainStar}（{result.starNature}）&middot; {result.yearTG}年生 &middot; {['水二局', '木三局', '金四局', '土五局', '火六局'][result.wuxingju - 2] || `${result.wuxingju}局`}
                </p>
              </div>
              <p className="text-base text-text leading-[1.9] mb-6">{result.personality}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-5">
                  <h4 className="text-sm font-bold text-green-400 mb-2">&#10003; 您的天生優勢</h4>
                  <p className="text-sm text-text leading-relaxed">{result.strengths}</p>
                </div>
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-5">
                  <h4 className="text-sm font-bold text-orange-400 mb-2">&#9888; 需要留意的地方</h4>
                  <p className="text-sm text-text leading-relaxed">{result.challenges}</p>
                </div>
              </div>
            </div>

            {/* 六大維度分析 — 跟八字一樣豐富 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: '事業方向', text: result.career, icon: '&#128188;', color: 'border-blue-500/20 bg-blue-500/5' },
                { title: '感情特質', text: result.love, icon: '&#10084;&#65039;', color: 'border-pink-500/20 bg-pink-500/5' },
                { title: '健康提醒', text: result.health, icon: '&#127973;', color: 'border-green-500/20 bg-green-500/5' },
                { title: '2026年運勢', text: result.year2026, icon: '&#9733;', color: 'border-yellow-500/20 bg-yellow-500/5' },
              ].map(item => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg" dangerouslySetInnerHTML={{ __html: item.icon }} />
                    <h4 className="text-base font-bold text-white">{item.title}</h4>
                  </div>
                  <p className="text-sm text-text leading-[1.8]">{item.text}</p>
                </div>
              ))}
            </div>

            {/* 幸運元素 — 開運指南 */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-base font-bold text-gold mb-3">&#128161; 您的開運指南</h3>
              <p className="text-base text-text leading-[1.8]">{result.lucky}</p>
            </div>

            {/* 四化星 */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                <h2 className="text-lg font-bold text-cream">四化飛星（{result.yearTG}年）</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {result.sihua.map((sh, i) => {
                  const types = ['化祿', '化權', '化科', '化忌']
                  const colors = ['text-green-400', 'text-blue-400', 'text-purple-400', 'text-red-400']
                  const bgs = ['bg-green-500/10', 'bg-blue-500/10', 'bg-purple-500/10', 'bg-red-500/10']
                  return (
                    <div key={i} className={`rounded-lg p-4 text-center ${bgs[i]}`}>
                      <div className={`text-xs ${colors[i]} mb-1`}>{types[i]}</div>
                      <div className="text-base font-bold text-white">{sh}</div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-text-muted/60 mt-3">
                化祿主財運亨通、化權主權勢掌握、化科主聲名遠播、化忌主困頓磨練
              </p>
            </div>

            {/* 十二宮位星曜 */}
            {Object.keys(result.palaceData).length > 0 && (
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gold rounded-full" />
                  <h2 className="text-lg font-bold text-white">十二宮位星曜</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PALACE_ORDER.map(palace => {
                    const data = result.palaceData[palace]
                    if (!data) return null
                    const allStars = [data.mainStars, data.minorStars].filter(Boolean).join('、')
                    return (
                      <div key={palace} className={`rounded-xl border p-4 ${PALACE_COLORS[palace] || 'border-white/10 bg-white/[0.02]'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-white">{palace}</span>
                          <span className="text-[10px] text-text-muted/50">{data.branch}</span>
                        </div>
                        <div className="text-sm text-gold mb-1">{data.mainStars || '無主星'}</div>
                        {data.minorStars && (
                          <div className="text-xs text-text-muted/70 mb-1.5">{data.minorStars}</div>
                        )}
                        <div className="text-[11px] text-text-muted/60">{PALACE_DESC[palace] || ''}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* AI 深度解讀 */}
            {result.hasAi && result.aiAnalysis && (
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gold rounded-full" />
                  <h2 className="text-lg font-bold text-cream">命盤深度解讀</h2>
                </div>
                <p className="text-base text-text leading-[2] whitespace-pre-line">{result.aiAnalysis}</p>
              </div>
            )}

            {/* 速算概覽提示 */}
            <p className="text-xs text-text-muted/50 text-center">以上為命宮主星速算概覽，完整報告將根據您的完整命盤做 15 系統個人化深度分析</p>

            {/* 升級引導 */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(184,134,11,0.12), rgba(26,58,92,0.4))' }}>
              <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    紫微斗數只是 15 套系統中的 <span className="text-gradient-gold">1 套</span>
                  </h3>
                  <p className="text-base text-text max-w-2xl mx-auto leading-relaxed">
                    完整報告還會融合<strong className="text-white">八字、奇門遁甲、西洋占星、姓名學</strong>等 14 套命理體系，
                    從多維度交叉驗證，為您呈現一份真正全面的命格分析。
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="glass rounded-xl p-5 text-center">
                    <div className="text-3xl mb-2">&#128218;</div>
                    <h4 className="font-bold text-white mb-1">15 系統交叉驗證</h4>
                    <p className="text-sm text-text-muted">東西方命理系統互相印證，結論更可靠</p>
                  </div>
                  <div className="glass rounded-xl p-5 text-center">
                    <div className="text-3xl mb-2">&#128202;</div>
                    <h4 className="font-bold text-white mb-1">11 章 30,000字+ 深度報告</h4>
                    <p className="text-sm text-text-muted">從命格名片到刻意練習，涵蓋人生全面向</p>
                  </div>
                  <div className="glass rounded-xl p-5 text-center">
                    <div className="text-3xl mb-2">&#128230;</div>
                    <h4 className="font-bold text-white mb-1">精美 PDF 永久保存</h4>
                    <p className="text-sm text-text-muted">隨時回顧，也可以分享給信任的人</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                    {(['C', 'D'] as const).map((plan, idx) => {
                      const q = new URLSearchParams({
                        plan,
                        name: form.name,
                        year: form.year,
                        month: form.month,
                        day: form.day,
                        hour: form.timeMode === 'exact' ? form.exactHour : form.hour,
                        minute: form.timeMode === 'exact' ? form.exactMinute : '0',
                        gender: form.gender,
                        timeMode: form.timeMode,
                        city: form.city,
                        cityLat: String(form.cityLat),
                        cityLng: String(form.cityLng),
                        cityTz: String(form.cityTz),
                      })
                      const label = idx === 0 ? '解鎖人生藍圖完整報告 $89' : '聚焦單一困惑深度分析 $39'
                      const cls = idx === 0
                        ? 'px-10 py-4 bg-gold text-dark font-bold rounded-xl text-lg btn-glow'
                        : 'px-10 py-4 glass text-white font-semibold rounded-xl text-lg hover:bg-white/10'
                      return <a key={plan} href={`/checkout?${q}`} className={cls}>{label}</a>
                    })}
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted/60 mb-4">
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
