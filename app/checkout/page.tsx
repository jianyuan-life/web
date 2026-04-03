'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import PriceTag from '@/components/PriceTag'
import { searchCities, type City } from '@/lib/cities'

const PLANS: Record<string, { name: string; price: number; systems: number }> = {
  C: { name: '全方位十五合一', price: 89, systems: 15 },
  A: { name: '核心三合一', price: 49, systems: 3 },
  D: { name: '專項深度分析', price: 29, systems: 15 },
  G15: { name: '家庭全方位十五合一', price: 269, systems: 15 },
  G3: { name: '家庭核心三合一', price: 149, systems: 3 },
  R: { name: '關於我與他', price: 59, systems: 15 },
  M: { name: '月度運勢分析', price: 19, systems: 14 },
  Y: { name: '年度運勢分析', price: 159, systems: 14 },
  E1: { name: '事件出門訣', price: 119, systems: 1 },
  E2: { name: '月盤出門訣', price: 89, systems: 1 },
  E3: { name: '年盤出門訣', price: 859, systems: 1 },
}

// G15/G3 每加一人的附加費
const FAMILY_EXTRA_PRICE: Record<string, number> = {
  G15: 69,
  G3: 39,
}

const SHICHEN = [
  { label: '子時 (23:00-01:00)', value: 0 },
  { label: '丑時 (01:00-03:00)', value: 2 },
  { label: '寅時 (03:00-05:00)', value: 4 },
  { label: '卯時 (05:00-07:00)', value: 6 },
  { label: '辰時 (07:00-09:00)', value: 8 },
  { label: '巳時 (09:00-11:00)', value: 10 },
  { label: '午時 (11:00-13:00)', value: 12 },
  { label: '未時 (13:00-15:00)', value: 14 },
  { label: '申時 (15:00-17:00)', value: 16 },
  { label: '酉時 (17:00-19:00)', value: 18 },
  { label: '戌時 (19:00-21:00)', value: 20 },
  { label: '亥時 (21:00-23:00)', value: 22 },
]

// 方案 D 分析主題選項
const D_TOPICS = ['財運', '事業', '感情', '健康', '學業', '搬家', '問事（其他）']

// 家庭方案成員資料型別
interface FamilyMember {
  name: string
  year: string
  month: string
  day: string
  hour: string
  timeMode: 'unknown' | 'shichen' | 'exact'
  minute: string
  gender: string
}

// 建立預設家庭成員
function newMember(): FamilyMember {
  return { name: '', year: '1990', month: '1', day: '1', hour: '12', timeMode: 'shichen', minute: '0', gender: 'M' }
}

// ────────────────────────────────────────────────────
// 單人出生時間區塊（可複用）
// ────────────────────────────────────────────────────
interface BirthTimeFieldProps {
  timeMode: 'unknown' | 'shichen' | 'exact'
  setTimeMode: (m: 'unknown' | 'shichen' | 'exact') => void
  hour: string
  minute: string
  onChange: (field: 'hour' | 'minute', val: string) => void
}
function BirthTimeField({ timeMode, setTimeMode, hour, minute, onChange }: BirthTimeFieldProps) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">出生時間</label>
      <div className="flex rounded-lg overflow-hidden border border-gold/20 mb-3">
        {([
          { key: 'unknown', label: '不確定' },
          { key: 'shichen', label: '知道時辰' },
          { key: 'exact', label: '知道精確時間' },
        ] as const).map(({ key, label }) => (
          <button key={key} type="button"
            onClick={() => setTimeMode(key)}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              timeMode === key
                ? 'bg-gold/20 text-gold border-b-2 border-gold'
                : 'bg-white/5 text-text-muted hover:text-white'
            }`}
          >{label}</button>
        ))}
      </div>
      {timeMode === 'unknown' && (
        <div className="bg-white/5 border border-gold/10 rounded-lg px-4 py-3 text-text-muted text-sm">
          將以正午（12:00）計算，部分時辰相關分析可能有偏差
        </div>
      )}
      {timeMode === 'shichen' && (
        <select value={hour} onChange={(e) => onChange('hour', e.target.value)}
          className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
          {SHICHEN.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      )}
      {timeMode === 'exact' && (
        <div className="flex gap-3">
          <select value={hour} onChange={(e) => onChange('hour', e.target.value)}
            className="flex-1 bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}時</option>
            ))}
          </select>
          <select value={minute} onChange={(e) => onChange('minute', e.target.value)}
            className="flex-1 bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}分</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────
// 單一家庭成員欄位區塊
// ────────────────────────────────────────────────────
interface FamilyMemberFieldProps {
  index: number
  member: FamilyMember
  canDelete: boolean
  onChange: (updated: FamilyMember) => void
  onDelete: () => void
}
function FamilyMemberField({ index, member, canDelete, onChange, onDelete }: FamilyMemberFieldProps) {
  return (
    <div className="border border-gold/20 rounded-xl p-4 space-y-3 bg-white/3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-gold">第 {index + 1} 位成員</span>
        {canDelete && (
          <button type="button" onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded px-2 py-0.5">
            移除
          </button>
        )}
      </div>

      {/* 姓名 */}
      <div>
        <label className="block text-xs text-text-muted mb-1">姓名 *</label>
        <input type="text" required placeholder="請輸入姓名"
          value={member.name}
          onChange={(e) => onChange({ ...member, name: e.target.value })}
          className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none text-sm"
        />
      </div>

      {/* 出生年月日 */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">出生年</label>
          <input type="number" min="1920" max="2025"
            value={member.year}
            onChange={(e) => onChange({ ...member, year: e.target.value })}
            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">月</label>
          <select value={member.month} onChange={(e) => onChange({ ...member, month: e.target.value })}
            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}月</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">日</label>
          <select value={member.day} onChange={(e) => onChange({ ...member, day: e.target.value })}
            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}日</option>
            ))}
          </select>
        </div>
      </div>

      {/* 性別 */}
      <div>
        <label className="block text-xs text-text-muted mb-1">性別 *</label>
        <div className="flex gap-6">
          {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={`gender-${index}`} value={v} checked={member.gender === v}
                onChange={() => onChange({ ...member, gender: v })} className="accent-gold" />
              <span className="text-sm text-text">{l}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 出生時間 */}
      <BirthTimeField
        timeMode={member.timeMode}
        setTimeMode={(m) => onChange({ ...member, timeMode: m })}
        hour={member.hour}
        minute={member.minute}
        onChange={(field, val) => onChange({ ...member, [field]: val })}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────
// 主表單
// ────────────────────────────────────────────────────
function CheckoutForm() {
  const params = useSearchParams()
  const planCode = params.get('plan') || 'C'
  const plan = PLANS[planCode] || PLANS.C

  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '12', minute: '0',
    gender: 'M', address: '', addressLat: 0, addressLng: 0,
    birthCity: '', cityLat: 0, cityLng: 0, cityTz: 8,
    calendarType: 'solar' as 'solar' | 'lunar',
    lunarLeap: false,
  })
  const [timeMode, setTimeMode] = useState<'unknown' | 'shichen' | 'exact'>('shichen')
  const [cityResults, setCityResults] = useState<City[]>([])
  const [addressResults, setAddressResults] = useState<{ label: string; lat: number; lng: number }[]>([])
  const [addressSearchTimer, setAddressSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── 方案 D 專屬 ──
  const [dTopic, setDTopic] = useState(D_TOPICS[0])
  const [dOtherDesc, setDOtherDesc] = useState('')

  // ── 方案 R 專屬 ──
  const [rSecondPerson, setRSecondPerson] = useState<FamilyMember>(newMember())
  const [rSecondTimeMode, setRSecondTimeMode] = useState<'unknown' | 'shichen' | 'exact'>('unknown')
  const [rRelationDesc, setRRelationDesc] = useState('')

  // ── 方案 G15/G3 專屬 ──
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    newMember(), newMember(), newMember(), newMember(),
  ])

  // ── 方案 E1 專屬 ──
  const [e1StartDate, setE1StartDate] = useState('')
  const [e1EndDate, setE1EndDate] = useState('')
  const [e1EventDesc, setE1EventDesc] = useState('')

  // ── 計算 G15/G3 實際金額 ──
  const extraMemberCount = Math.max(0, familyMembers.length - 4)
  const extraPrice = FAMILY_EXTRA_PRICE[planCode] ?? 0
  const totalPrice = ['G15', 'G3'].includes(planCode)
    ? plan.price + extraMemberCount * extraPrice
    : plan.price

  const searchAddress = (query: string) => {
    if (addressSearchTimer) clearTimeout(addressSearchTimer)
    if (query.length < 3) { setAddressResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'zh-TW,zh' } }
        )
        const data = await res.json()
        setAddressResults(data.map((d: { display_name: string; lat: string; lon: string }) => ({
          label: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        })))
      } catch { setAddressResults([]) }
    }, 500)
    setAddressSearchTimer(timer)
  }

  const [authChecked, setAuthChecked] = useState(false)

  // Auth guard: 沒登入就跳走
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        sessionStorage.setItem('pending_plan', planCode)
        window.location.href = '/auth/login'
      } else {
        const fullName = data.user.user_metadata?.full_name || ''
        if (fullName) setForm(f => ({ ...f, name: fullName }))
        setAuthChecked(true)
      }
    })
  }, [planCode])

  if (!authChecked) {
    return <div className="py-20 text-center text-text-muted">驗證登入狀態...</div>
  }

  // ── 家庭方案成員操作 ──
  const updateFamilyMember = (index: number, updated: FamilyMember) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? updated : m))
  }
  const addFamilyMember = () => {
    if (familyMembers.length < 8) {
      setFamilyMembers(prev => [...prev, newMember()])
    }
  }
  const removeFamilyMember = (index: number) => {
    if (index >= 4) {
      setFamilyMembers(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    // 家庭方案驗證
    if (['G15', 'G3'].includes(planCode)) {
      for (let i = 0; i < familyMembers.length; i++) {
        if (!familyMembers[i].name.trim()) {
          alert(`請輸入第 ${i + 1} 位成員的姓名`)
          return
        }
      }
    } else {
      if (!form.name.trim()) { alert('請輸入姓名'); return }
    }

    // R 方案驗證
    if (planCode === 'R') {
      if (!rSecondPerson.name.trim()) { alert('請輸入第二位當事人姓名'); return }
      if (!rRelationDesc.trim()) { alert('請描述你們的關係與想了解的問題'); return }
    }

    // E1 方案驗證
    if (planCode === 'E1') {
      if (!e1StartDate || !e1EndDate) { alert('請選擇事件時間範圍'); return }
      if (!e1EventDesc.trim()) { alert('請描述事件背景與目標'); return }
    }

    setLoading(true)

    try {
      // 組合 birthData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let birthData: Record<string, any> = {}

      if (['G15', 'G3'].includes(planCode)) {
        // 家庭方案：多人資料
        birthData = {
          plan_type: 'family',
          members: familyMembers.map(m => ({
            name: m.name,
            year: parseInt(m.year),
            month: parseInt(m.month),
            day: parseInt(m.day),
            hour: m.timeMode === 'unknown' ? 12 : parseInt(m.hour),
            minute: m.timeMode === 'exact' ? parseInt(m.minute) : 0,
            gender: m.gender,
            time_unknown: m.timeMode === 'unknown',
            time_mode: m.timeMode,
          })),
        }
      } else {
        // 單人基本資料
        birthData = {
          name: form.name,
          year: parseInt(form.year),
          month: parseInt(form.month),
          day: parseInt(form.day),
          hour: timeMode === 'unknown' ? 12 : parseInt(form.hour),
          minute: timeMode === 'exact' ? parseInt(form.minute) : 0,
          gender: form.gender,
          address: form.address,
          address_lat: form.addressLat || undefined,
          address_lng: form.addressLng || undefined,
          time_unknown: timeMode === 'unknown',
          time_mode: timeMode,
          latitude: form.cityLat || undefined,
          longitude: form.cityLng || undefined,
          timezone_offset: form.cityTz,
          birth_city: form.birthCity || undefined,
          calendar_type: form.calendarType,
          lunar_leap: form.calendarType === 'lunar' ? form.lunarLeap : undefined,
        }

        // D 方案額外資料
        if (planCode === 'D') {
          birthData.analysis_topic = dTopic
          if (dTopic === '問事（其他）') {
            birthData.other_question = dOtherDesc
          }
        }

        // R 方案額外資料
        if (planCode === 'R') {
          birthData.second_person = {
            name: rSecondPerson.name,
            year: parseInt(rSecondPerson.year),
            month: parseInt(rSecondPerson.month),
            day: parseInt(rSecondPerson.day),
            hour: rSecondTimeMode === 'unknown' ? 12 : parseInt(rSecondPerson.hour),
            minute: rSecondTimeMode === 'exact' ? parseInt(rSecondPerson.minute) : 0,
            gender: rSecondPerson.gender,
            time_unknown: rSecondTimeMode === 'unknown',
          }
          birthData.relation_description = rRelationDesc
        }

        // E1 方案額外資料
        if (planCode === 'E1') {
          birthData.event_start_date = e1StartDate
          birthData.event_end_date = e1EndDate
          birthData.event_description = e1EventDesc
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode,
          totalPrice: ['G15', 'G3'].includes(planCode) ? totalPrice : undefined,
          birthData,
        }),
      })
      const data = await res.json()
      if (data.url && data.url.startsWith('http')) {
        window.location.href = data.url
      } else {
        setError(data.error || '付款建立失敗，請稍後再試')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  // ── 判斷是否為家庭方案 ──
  const isFamilyPlan = planCode === 'G15' || planCode === 'G3'

  return (
    <div className="py-20">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-gradient-gold">確認訂單</span>
        </h1>
        <p className="text-center text-text-muted mb-10">填寫出生資料，完成付款後自動生成報告</p>

        {/* E2/E3 提示框 */}
        {(planCode === 'E2' || planCode === 'E3') && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-400/40 rounded-xl px-5 py-4 flex gap-3 items-start">
            <span className="text-yellow-400 text-lg mt-0.5">📋</span>
            <p className="text-yellow-200 text-sm leading-relaxed">
              購買出門訣前，請確認您已持有 <strong>C 或 A 方案報告</strong>，否則我們無法為您精準排盤。
            </p>
          </div>
        )}

        {/* 方案摘要 */}
        <div className="glass rounded-xl p-5 mb-8 flex justify-between items-center">
          <div>
            <div className="text-xs text-gold font-mono">方案 {planCode}</div>
            <div className="text-lg font-bold text-white">{plan.name}</div>
            <div className="text-xs text-text-muted">
              {isFamilyPlan
                ? `基本 4 人，第 5 人起 +$${extraPrice}/人`
                : `${plan.systems} 套系統分析`}
            </div>
            {isFamilyPlan && extraMemberCount > 0 && (
              <div className="text-xs text-gold mt-1">
                目前 {familyMembers.length} 人，額外 {extraMemberCount} 人 × ${extraPrice} = +${extraMemberCount * extraPrice}
              </div>
            )}
          </div>
          <PriceTag usd={totalPrice} size="lg" />
        </div>

        {/* ── 家庭方案表單 ── */}
        {isFamilyPlan ? (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-4">
              {familyMembers.map((member, index) => (
                <FamilyMemberField
                  key={index}
                  index={index}
                  member={member}
                  canDelete={index >= 4}
                  onChange={(updated) => updateFamilyMember(index, updated)}
                  onDelete={() => removeFamilyMember(index)}
                />
              ))}
            </div>

            {familyMembers.length < 8 && (
              <button type="button" onClick={addFamilyMember}
                className="w-full py-3 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/10 transition-all">
                + 加入第 {familyMembers.length + 1} 位家庭成員
                <span className="text-text-muted ml-2">（+${extraPrice}）</span>
              </button>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {loading ? '跳轉付款中...' : `確認付款 — $${totalPrice}`}
            </button>
            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理。付款後 5-15 分鐘內收到報告。
            </p>
          </form>
        ) : (
          /* ── 單人表單 ── */
          <form onSubmit={handleCheckout} className="glass rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">姓名 *</label>
              <input
                type="text" required placeholder="請輸入您的全名"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none"
              />
            </div>

            {/* 國曆/農曆切換 */}
            <div>
              <label className="block text-xs text-text-muted mb-1">曆法</label>
              <div className="flex rounded-lg overflow-hidden border border-gold/20">
                {([{ v: 'solar' as const, l: '國曆（西曆）' }, { v: 'lunar' as const, l: '農曆' }]).map(({ v, l }) => (
                  <button key={v} type="button"
                    onClick={() => setForm({ ...form, calendarType: v, lunarLeap: false })}
                    className={`flex-1 py-2.5 text-sm font-medium transition-all ${form.calendarType === v ? 'bg-gold/20 text-gold' : 'bg-white/5 text-text-muted hover:bg-white/5'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.calendarType === 'lunar' && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.lunarLeap}
                    onChange={(e) => setForm({ ...form, lunarLeap: e.target.checked })}
                    className="accent-gold" />
                  <span className="text-xs text-text-muted">閏月</span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">出生年</label>
                <input
                  type="number" min="1920" max="2025"
                  value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">{form.calendarType === 'lunar' ? '農曆月' : '月'}</label>
                <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {form.calendarType === 'lunar'
                        ? ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'][i] + '月'
                        : `${i + 1}月`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">{form.calendarType === 'lunar' ? '農曆日' : '日'}</label>
                <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                  {Array.from({ length: form.calendarType === 'lunar' ? 30 : 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {form.calendarType === 'lunar'
                        ? ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'][i]
                        : `${i + 1}日`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <BirthTimeField
              timeMode={timeMode}
              setTimeMode={setTimeMode}
              hour={form.hour}
              minute={form.minute}
              onChange={(field, val) => setForm({ ...form, [field]: val })}
            />

            <div>
              <label className="block text-xs text-text-muted mb-1">性別</label>
              <div className="flex gap-6">
                {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value={v} checked={form.gender === v}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })} className="accent-gold" />
                    <span className="text-sm text-text">{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs text-text-muted mb-1">出生城市（可選，用於真太陽時校正）</label>
              <input
                type="text"
                placeholder="輸入城市名（如：台北、香港、上海）"
                value={form.birthCity}
                onChange={(e) => {
                  const val = e.target.value
                  setForm({ ...form, birthCity: val, cityLat: 0, cityLng: 0 })
                  setCityResults(val.length >= 1 ? searchCities(val) : [])
                }}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
              />
              {cityResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-dark border border-gold/20 rounded-lg overflow-hidden shadow-xl">
                  {cityResults.map((c: City) => (
                    <button key={`${c.name}-${c.lat}`} type="button"
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gold/10 border-b border-gold/5 last:border-0"
                      onClick={() => {
                        setForm({ ...form, birthCity: `${c.name}（${c.country}）`, cityLat: c.lat, cityLng: c.lng, cityTz: c.tz })
                        setCityResults([])
                      }}
                    >{c.name}（{c.country}）</button>
                  ))}
                </div>
              )}
              {form.cityLat !== 0 && (
                <p className="text-[10px] text-text-muted/50 mt-1">
                  經度 {form.cityLng.toFixed(2)}° | 時區 UTC{form.cityTz >= 0 ? '+' : ''}{form.cityTz} | 將自動校正真太陽時
                </p>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs text-text-muted mb-1">住址（風水分析用，可選）</label>
              <input
                type="text" placeholder="輸入地址搜尋（如：台北市信義區松仁路...）"
                value={form.address}
                onChange={(e) => {
                  const val = e.target.value
                  setForm({ ...form, address: val, addressLat: 0, addressLng: 0 })
                  searchAddress(val)
                }}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
              />
              {addressResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-dark border border-gold/20 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                  {addressResults.map((r, i) => (
                    <button key={i} type="button"
                      className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-gold/10 border-b border-gold/5 last:border-0 leading-relaxed"
                      onClick={() => {
                        setForm({ ...form, address: r.label, addressLat: r.lat, addressLng: r.lng })
                        setAddressResults([])
                      }}
                    >{r.label}</button>
                  ))}
                </div>
              )}
              {form.addressLat !== 0 && (
                <p className="text-[10px] text-text-muted/50 mt-1">
                  📍 緯度 {form.addressLat.toFixed(4)}° 經度 {form.addressLng.toFixed(4)}° | 精確坐向計算已啟用
                </p>
              )}
            </div>

            {/* ── 方案 D：分析主題 ── */}
            {planCode === 'D' && (
              <div className="border-t border-gold/10 pt-4 space-y-3">
                <p className="text-sm font-semibold text-gold">專項分析設定</p>
                <div>
                  <label className="block text-xs text-text-muted mb-1">分析主題 *</label>
                  <select
                    required
                    value={dTopic}
                    onChange={(e) => setDTopic(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
                  >
                    {D_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {dTopic === '問事（其他）' && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">請描述您的問題 *（最多 200 字）</label>
                    <textarea
                      required
                      maxLength={200}
                      rows={3}
                      placeholder="請詳細說明您想了解的問題..."
                      value={dOtherDesc}
                      onChange={(e) => setDOtherDesc(e.target.value)}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none"
                    />
                    <p className="text-[10px] text-text-muted/50 text-right mt-1">{dOtherDesc.length}/200</p>
                  </div>
                )}
              </div>
            )}

            {/* ── 方案 R：第二位當事人 ── */}
            {planCode === 'R' && (
              <div className="border-t border-gold/10 pt-4 space-y-4">
                <p className="text-sm font-semibold text-gold">第二位當事人資料</p>

                <div>
                  <label className="block text-xs text-text-muted mb-1">第二人姓名 *</label>
                  <input
                    type="text" required placeholder="請輸入第二位當事人姓名"
                    value={rSecondPerson.name}
                    onChange={(e) => setRSecondPerson({ ...rSecondPerson, name: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">出生年 *</label>
                    <input type="number" min="1920" max="2025" required
                      value={rSecondPerson.year}
                      onChange={(e) => setRSecondPerson({ ...rSecondPerson, year: e.target.value })}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">月 *</label>
                    <select value={rSecondPerson.month}
                      onChange={(e) => setRSecondPerson({ ...rSecondPerson, month: e.target.value })}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">日 *</label>
                    <select value={rSecondPerson.day}
                      onChange={(e) => setRSecondPerson({ ...rSecondPerson, day: e.target.value })}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                      {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-muted mb-1">第二人性別 *</label>
                  <div className="flex gap-6">
                    {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="r-gender-2" value={v} checked={rSecondPerson.gender === v}
                          onChange={() => setRSecondPerson({ ...rSecondPerson, gender: v })} className="accent-gold" />
                        <span className="text-sm text-text">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <BirthTimeField
                  timeMode={rSecondTimeMode}
                  setTimeMode={setRSecondTimeMode}
                  hour={rSecondPerson.hour}
                  minute={rSecondPerson.minute}
                  onChange={(field, val) => setRSecondPerson({ ...rSecondPerson, [field]: val })}
                />

                <div>
                  <label className="block text-xs text-text-muted mb-1">關係說明 *（最多 200 字）</label>
                  <textarea
                    required
                    maxLength={200}
                    rows={3}
                    placeholder="請描述你們的關係（如：戀人、夫妻、合作夥伴），以及想了解的問題..."
                    value={rRelationDesc}
                    onChange={(e) => setRRelationDesc(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none"
                  />
                  <p className="text-[10px] text-text-muted/50 text-right mt-1">{rRelationDesc.length}/200</p>
                </div>
              </div>
            )}

            {/* ── 方案 E1：事件時間與描述 ── */}
            {planCode === 'E1' && (
              <div className="border-t border-gold/10 pt-4 space-y-3">
                <p className="text-sm font-semibold text-gold">事件資訊</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">事件開始日期 *</label>
                    <input
                      type="date" required
                      value={e1StartDate}
                      onChange={(e) => setE1StartDate(e.target.value)}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">事件結束日期 *</label>
                    <input
                      type="date" required
                      value={e1EndDate}
                      min={e1StartDate}
                      onChange={(e) => setE1EndDate(e.target.value)}
                      className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">事件描述 *（最多 200 字）</label>
                  <textarea
                    required
                    maxLength={200}
                    rows={3}
                    placeholder="請描述事件背景（如：重要面試、簽約、旅行）與希望達成的目標..."
                    value={e1EventDesc}
                    onChange={(e) => setE1EventDesc(e.target.value)}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none"
                  />
                  <p className="text-[10px] text-text-muted/50 text-right mt-1">{e1EventDesc.length}/200</p>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {loading ? '跳轉付款中...' : `確認付款`}
            </button>

            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理。付款後 5-15 分鐘內收到報告。
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-muted">載入中...</div>}>
      <CheckoutForm />
    </Suspense>
  )
}
