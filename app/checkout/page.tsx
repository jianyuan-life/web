'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import PriceTag from '@/components/PriceTag'
import { searchCities, type City } from '@/lib/cities'

const PLANS: Record<string, { name: string; price: number; systems: number }> = {
  C: { name: '人生藍圖', price: 89, systems: 15 },
  D: { name: '心之所惑', price: 39, systems: 15 },
  G15: { name: '家族藍圖', price: 159, systems: 15 },
  R: { name: '合否？', price: 59, systems: 15 },
  E1: { name: '事件出門訣', price: 119, systems: 1 },
  E2: { name: '月盤出門訣', price: 89, systems: 1 },
}

// 每加一人的附加費
const FAMILY_EXTRA_PRICE: Record<string, number> = {
  G15: 69,
  R: 19,
}

// 各方案結帳頁說明文字
const PLAN_DESCRIPTIONS: Record<string, string> = {
  C: '填寫您的出生資料，我們將為您進行十五套命理系統深度分析',
  D: '請選擇分析主題並填寫出生資料',
  G15: '請填寫每位家庭成員的出生資料',
  R: '請填寫雙方（或多方）的出生資料',
  E1: '請填寫您的出生資料與事件背景。系統將精確排算事件前後各時段的奇門局，套入您的命格驗證吉位，交出針對此事最精準的 Top 5 出行方案。計算需 40 分鐘以上。',
  E2: '請填寫您的出生資料。系統將從今日起，逐一排算未來 30 天共 360 個時辰的奇門局，套入您的命格找出個人吉位，篩選出 Top 5 最適合出行的時機與方向。計算需 40 分鐘以上，完成後可在儀表板查看。',
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
          將以正午（12:00）計算，部分時辰相關分析可能有偏差。<br/>
          <span className="text-[10px] text-text-muted/60">小提示：可詢問父母或查看出生證明，知道大概時段也可以選「知道時辰」。</span>
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
          <input type="number" min="1920" max="2030"
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
    name: params.get('name') || '',
    year: params.get('year') || '1990',
    month: params.get('month') || '1',
    day: params.get('day') || '1',
    hour: params.get('hour') || '12',
    minute: params.get('minute') || '0',
    gender: params.get('gender') || 'M',
    address: '', addressLat: 0, addressLng: 0,
    birthCity: '', cityLat: 0, cityLng: 0, cityTz: 8,
    calendarType: (params.get('calendarType') || 'solar') as 'solar' | 'lunar',
    lunarLeap: false,
  })
  const [timeMode, setTimeMode] = useState<'unknown' | 'shichen' | 'exact'>(
    (params.get('timeMode') as 'unknown' | 'shichen' | 'exact') || 'shichen'
  )
  const [cityResults, setCityResults] = useState<City[]>([])
  const [addressResults, setAddressResults] = useState<{ label: string; lat: number; lng: number }[]>([])
  const [addressSearchTimer, setAddressSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── 優惠碼 ──
  const [couponInput, setCouponInput] = useState('')
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountAmount: number; message: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  // ── 備注欄（所有方案共用）──
  const [customerNote, setCustomerNote] = useState('')

  // ── 方案 D 專屬 ──
  const [dTopic, setDTopic] = useState(D_TOPICS[0])
  const [dOtherDesc, setDOtherDesc] = useState('')

  // ── 方案 R 專屬（動態多人）──
  const [rMembers, setRMembers] = useState<FamilyMember[]>([newMember(), newMember()])
  const [rRelationDesc, setRRelationDesc] = useState('')

  // ── 方案 G15/G3 專屬 ──
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    newMember(), newMember(),
  ])

  // ── 方案 E1 專屬 ──
  const [e1StartDate, setE1StartDate] = useState('')
  const [e1EndDate, setE1EndDate] = useState('')
  const [e1EventDesc, setE1EventDesc] = useState('')

  // ── 方案 E1/E2 共用：可配合時間段 ──
  const [eAllDay, setEAllDay] = useState(true)
  const [eTimeSlots, setETimeSlots] = useState<{ start: string; end: string }[]>([
    { start: '09:00', end: '12:00' }
  ])

  // ── 計算實際金額 ──
  const extraMemberCount = Math.max(0, familyMembers.length - 2)
  const extraPrice = FAMILY_EXTRA_PRICE[planCode] ?? 0
  const rExtraCount = Math.max(0, rMembers.length - 2)
  const totalPrice = ['G15', 'G3'].includes(planCode)
    ? plan.price + extraMemberCount * extraPrice
    : planCode === 'R'
    ? plan.price + rExtraCount * 19
    : plan.price
  const finalPrice = couponApplied ? Math.max(0, totalPrice - couponApplied.discountAmount) : totalPrice

  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponApplied(null)
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponInput)}&plan=${planCode}&amount=${totalPrice}`)
      const data = await res.json()
      if (data.valid) {
        setCouponApplied({ code: couponInput.trim().toUpperCase(), discountAmount: data.discountAmount, message: data.message })
      } else {
        setCouponError(data.message || '優惠碼無效')
      }
    } catch {
      setCouponError('驗證失敗，請稍後再試')
    } finally {
      setCouponLoading(false)
    }
  }

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
  const [previousBirthData, setPreviousBirthData] = useState<Record<string, unknown> | null>(null)
  const [importedPrevious, setImportedPrevious] = useState(false)

  // Auth guard + 抓歷史 birth_data
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        sessionStorage.setItem('pending_plan', planCode)
        window.location.href = '/auth/login'
      } else {
        const fullName = data.user.user_metadata?.full_name || ''
        if (fullName && !params.get('name')) setForm(f => ({ ...f, name: fullName }))
        setAuthChecked(true)

        // 若表單沒從 URL 預填，嘗試從上一份報告抓 birth_data
        if (!params.get('name')) {
          try {
            const res = await fetch('/api/reports')
            const { reports } = await res.json()
            const prev = (reports || []).find(
              (r: { birth_data?: Record<string, unknown>; plan_code?: string }) =>
                r.birth_data && r.plan_code && !['R', 'G15'].includes(r.plan_code as string)
            )
            if (prev?.birth_data) setPreviousBirthData(prev.birth_data)
          } catch { /* 靜默失敗 */ }
        }
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
    if (index >= 2) {
      setFamilyMembers(prev => prev.filter((_, i) => i !== index))
    }
  }

  // ── R 方案成員操作 ──
  const updateRMember = (index: number, updated: FamilyMember) => {
    setRMembers(prev => prev.map((m, i) => i === index ? updated : m))
  }
  const addRMember = () => {
    if (rMembers.length < 6) {
      setRMembers(prev => [...prev, newMember()])
    }
  }
  const removeRMember = (index: number) => {
    if (index >= 2) {
      setRMembers(prev => prev.filter((_, i) => i !== index))
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
      for (let i = 0; i < rMembers.length; i++) {
        if (!rMembers[i].name.trim()) {
          alert(`請輸入${i === 0 ? '您' : `第 ${i + 1} 位當事人`}的姓名`)
          return
        }
      }
      if (!rRelationDesc.trim()) { alert('請描述你們的關係與想了解的問題'); return }
    }

    // E1 方案驗證
    if (planCode === 'E1') {
      if (!e1StartDate || !e1EndDate) { alert('請選擇事件時間範圍'); return }
      if (!e1EventDesc.trim()) { alert('請描述事件背景與目標'); return }
    }

    // E1/E2 時段驗證
    if ((planCode === 'E1' || planCode === 'E2') && !eAllDay) {
      const validSlots = eTimeSlots.filter(s => s.start && s.end)
      if (validSlots.length === 0) {
        alert('請至少填寫一個可配合時段，或勾選全時段皆可')
        return
      }
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

        // R 方案改為多人格式
        if (planCode === 'R') {
          birthData = {
            plan: 'R',
            members: rMembers.map((m, i) => ({
              name: m.name,
              year: parseInt(m.year),
              month: parseInt(m.month),
              day: parseInt(m.day),
              hour: m.timeMode === 'unknown' ? 12 : parseInt(m.hour),
              minute: m.timeMode === 'exact' ? parseInt(m.minute) : 0,
              gender: m.gender,
              time_unknown: m.timeMode === 'unknown',
              time_mode: m.timeMode,
              role: i === 0 ? 'self' : 'other',
            })),
            relation_description: rRelationDesc,
          }
        }

        // E1 方案額外資料
        if (planCode === 'E1') {
          birthData.event_start_date = e1StartDate
          birthData.event_end_date = e1EndDate
          birthData.event_description = e1EventDesc
        }

        // E1/E2 可配合時間段
        if (planCode === 'E1' || planCode === 'E2') {
          birthData.available_time_slots = eAllDay ? null : eTimeSlots.filter(s => s.start && s.end)
        }

        // 備注（所有方案共用）
        if (customerNote.trim()) {
          birthData.customer_note = customerNote.trim()
        }
      }

      // 讀取用戶語言偏好（繁體/簡體）
      const userLocale = (typeof window !== 'undefined' && localStorage.getItem('locale')) || 'zh-TW'

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode,
          totalPrice: ['G15', 'G3', 'R'].includes(planCode) ? finalPrice : undefined,
          birthData,
          locale: userLocale,
          couponCode: couponApplied?.code || undefined,
          couponDiscount: couponApplied?.discountAmount || undefined,
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

  // ── 判斷方案類型 ──
  const isFamilyPlan = planCode === 'G15' || planCode === 'G3'
  const isRelationPlan = planCode === 'R'

  return (
    <div className="py-20">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-gradient-gold">確認訂單</span>
        </h1>
        <p className="text-center text-text-muted mb-6">{PLAN_DESCRIPTIONS[planCode] || '填寫出生資料，完成付款後自動生成報告'}</p>

        {/* 安全保證 */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 text-[10px] text-text-muted/60">
          <span className="flex items-center gap-1"><span className="text-green-400">&#9679;</span> SSL 加密傳輸</span>
          <span className="flex items-center gap-1"><span className="text-green-400">&#9679;</span> Stripe 安全付款</span>
          <span className="flex items-center gap-1"><span className="text-green-400">&#9679;</span> 資料隱私保護</span>
        </div>

        {/* 方案摘要 */}
        <div className="glass rounded-xl p-5 mb-8 flex justify-between items-center">
          <div>
            <div className="text-xs text-gold font-mono">方案 {planCode}</div>
            <div className="text-lg font-bold text-white">{plan.name}</div>
            <div className="text-xs text-text-muted">
              {isFamilyPlan
                ? `基礎 2 人 $159，每加一人 +$${extraPrice}`
                : isRelationPlan
                ? '含兩人分析，每加1人 +$19/人'
                : `${plan.systems} 套系統分析`}
            </div>
            {isFamilyPlan && extraMemberCount > 0 && (
              <div className="text-xs text-gold mt-1">
                目前 {familyMembers.length} 人，額外 {extraMemberCount} 人 × ${extraPrice} = +${extraMemberCount * extraPrice}
              </div>
            )}
            {isRelationPlan && rExtraCount > 0 && (
              <div className="text-xs text-gold mt-1">
                目前 {rMembers.length} 人，額外 {rExtraCount} 人 × $19 = +${rExtraCount * 19}
              </div>
            )}
          </div>
          <div className="text-right">
            {couponApplied && (
              <div className="text-xs text-green-400 line-through mb-0.5">${totalPrice}</div>
            )}
            <PriceTag usd={finalPrice} size="lg" />
            {couponApplied && finalPrice === 0 && (
              <div className="text-xs text-green-400 font-bold mt-0.5">免費體驗</div>
            )}
          </div>
        </div>

        {/* ── 優惠碼 ── */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="輸入優惠碼"
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value); setCouponError(''); if (couponApplied) setCouponApplied(null) }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
              className="flex-1 bg-white/5 border border-gold/10 rounded-lg px-4 py-2 text-cream text-sm focus:border-gold/40 focus:outline-none uppercase"
            />
            <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
              className="px-4 py-2 bg-gold/20 border border-gold/30 text-gold text-sm rounded-lg hover:bg-gold/30 disabled:opacity-40 whitespace-nowrap">
              {couponLoading ? '...' : '套用'}
            </button>
          </div>
          {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
          {couponApplied && (
            <div className="flex items-center justify-between mt-1">
              <p className="text-green-400 text-xs">{couponApplied.message}</p>
              <button type="button" onClick={() => { setCouponApplied(null); setCouponInput('') }}
                className="text-xs text-text-muted/50 hover:text-red-400 ml-2">移除</button>
            </div>
          )}
        </div>

        {/* ── R 方案多人表單 ── */}
        {isRelationPlan ? (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-4">
              {rMembers.map((member, index) => {
                const label = index === 0 ? '我' : index === 1 ? '對方' : `第 ${index + 1} 位當事人`
                return (
                  <div key={index} className="border border-gold/20 rounded-xl p-4 space-y-3 bg-white/3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gold">{label}</span>
                      {index >= 2 && (
                        <button type="button" onClick={() => removeRMember(index)}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded px-2 py-0.5">
                          移除
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">姓名 *</label>
                      <input type="text" required placeholder={`請輸入${label}的姓名`}
                        value={member.name}
                        onChange={(e) => updateRMember(index, { ...member, name: e.target.value })}
                        className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">出生年</label>
                        <input type="number" min="1920" max="2030"
                          value={member.year}
                          onChange={(e) => updateRMember(index, { ...member, year: e.target.value })}
                          className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">月</label>
                        <select value={member.month} onChange={(e) => updateRMember(index, { ...member, month: e.target.value })}
                          className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">日</label>
                        <select value={member.day} onChange={(e) => updateRMember(index, { ...member, day: e.target.value })}
                          className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">性別 *</label>
                      <div className="flex gap-6">
                        {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name={`r-gender-${index}`} value={v} checked={member.gender === v}
                              onChange={() => updateRMember(index, { ...member, gender: v })} className="accent-gold" />
                            <span className="text-sm text-text">{l}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <BirthTimeField
                      timeMode={member.timeMode}
                      setTimeMode={(m) => updateRMember(index, { ...member, timeMode: m })}
                      hour={member.hour}
                      minute={member.minute}
                      onChange={(field, val) => updateRMember(index, { ...member, [field]: val })}
                    />
                  </div>
                )
              })}
            </div>

            {rMembers.length < 6 && (
              <button type="button" onClick={addRMember}
                className="w-full py-3 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/10 transition-all">
                + 加入第 {rMembers.length + 1} 位當事人
                <span className="text-text-muted ml-2">（+$19）</span>
              </button>
            )}

            {/* 關係說明 */}
            <div className="border-t border-gold/10 pt-4">
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

            {/* ── 備注欄 ── */}
            <div className="border-t border-gold/10 pt-4 space-y-2">
              <label className="block text-xs text-text-muted">備注 / 想問的問題（選填）</label>
              <textarea
                maxLength={300}
                rows={3}
                placeholder="有什麼想特別告訴命理師的事、或想請系統重點分析的問題，請在這裡填寫..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none placeholder:text-text-muted/40"
              />
              <p className="text-[10px] text-text-muted/50 text-right">{customerNote.length}/300</p>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {loading ? '跳轉付款中...' : finalPrice === 0 ? '免費領取報告' : `確認付款 — $${finalPrice}`}
            </button>
            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理。報告平均需 30 分鐘以上，出門訣需 40 分鐘以上。
            </p>
          </form>
        ) : isFamilyPlan ? (
          /* ── 家庭方案表單 ── */
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

            {/* ── 備注欄 ── */}
            <div className="border-t border-gold/10 pt-4 space-y-2">
              <label className="block text-xs text-text-muted">備注 / 想問的問題（選填）</label>
              <textarea
                maxLength={300}
                rows={3}
                placeholder="有什麼想特別告訴命理師的事、或想請系統重點分析的問題，請在這裡填寫..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none placeholder:text-text-muted/40"
              />
              <p className="text-[10px] text-text-muted/50 text-right">{customerNote.length}/300</p>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {loading ? '跳轉付款中...' : finalPrice === 0 ? '免費領取報告' : `確認付款 — $${finalPrice}`}
            </button>
            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理。報告平均需 30 分鐘以上，出門訣需 40 分鐘以上。
            </p>
          </form>
        ) : (
          /* ── 單人表單 ── */
          <form onSubmit={handleCheckout} className="glass rounded-2xl p-6 space-y-4">
            {/* 一鍵導入上次資料 */}
            {previousBirthData && !importedPrevious && (
              <div className="flex items-center justify-between bg-gold/8 border border-gold/20 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-cream font-medium">偵測到上次的資料</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {String(previousBirthData.name || '')}・{String(previousBirthData.year || '')}年{String(previousBirthData.month || '')}月{String(previousBirthData.day || '')}日
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const d = previousBirthData
                    setForm(f => ({
                      ...f,
                      name: String(d.name || f.name),
                      year: String(d.year || f.year),
                      month: String(d.month || f.month),
                      day: String(d.day || f.day),
                      hour: String(d.hour || f.hour),
                      minute: String(d.minute || f.minute),
                      gender: String(d.gender || f.gender) as 'M' | 'F',
                      birthCity: String(d.birth_city || ''),
                      calendarType: (d.calendar_type as 'solar' | 'lunar') || f.calendarType,
                    }))
                    if (d.time_mode) setTimeMode(d.time_mode as 'unknown' | 'shichen' | 'exact')
                    setImportedPrevious(true)
                  }}
                  className="ml-4 shrink-0 px-4 py-1.5 bg-gold text-dark text-xs font-bold rounded-lg btn-glow"
                >
                  一鍵導入
                </button>
              </div>
            )}

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
                  type="number" min="1920" max="2030"
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

            {/* 住址欄位已移除——我們只看方位不看風水 */}

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

            {/* ── E1/E2 可配合時間段（選填）── */}
            {(planCode === 'E1' || planCode === 'E2') && (
              <div className="border-t border-gold/10 pt-4 space-y-3">
                <p className="text-sm font-semibold text-gold">可配合出行的時間段（選填）</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  奇門遁甲會依據您的命盤，在全天找出最佳吉時。若您的作息有固定限制（如只有晚上有空、或早上某段時間），請填寫您方便的時段——我們將只在這些時間範圍內為您篩選最合適的出行時機。
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={eAllDay}
                    onChange={(e) => setEAllDay(e.target.checked)}
                    className="accent-gold mt-0.5" />
                  <div>
                    <span className="text-sm text-text">全時段皆可</span>
                    {eAllDay && (
                      <p className="text-[10px] text-text-muted/60 mt-0.5">勾選後，系統將從全天24小時中挑選最強的吉時，不限時段。</p>
                    )}
                  </div>
                </label>

                {!eAllDay && (
                  <div className="space-y-2">
                    {eTimeSlots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="time" value={slot.start}
                          onChange={(e) => {
                            const updated = [...eTimeSlots]
                            updated[i] = { ...slot, start: e.target.value }
                            setETimeSlots(updated)
                          }}
                          className="bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-white text-sm focus:border-gold focus:outline-none [color-scheme:dark]"
                        />
                        <span className="text-text-muted text-xs">至</span>
                        <input type="time" value={slot.end}
                          onChange={(e) => {
                            const updated = [...eTimeSlots]
                            updated[i] = { ...slot, end: e.target.value }
                            setETimeSlots(updated)
                          }}
                          className="bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-white text-sm focus:border-gold focus:outline-none [color-scheme:dark]"
                        />
                        {eTimeSlots.length > 1 && (
                          <button type="button"
                            onClick={() => setETimeSlots(prev => prev.filter((_, j) => j !== i))}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded px-2 py-0.5">
                            移除
                          </button>
                        )}
                      </div>
                    ))}
                    {eTimeSlots.length < 5 && (
                      <button type="button"
                        onClick={() => setETimeSlots(prev => [...prev, { start: '09:00', end: '12:00' }])}
                        className="text-xs text-gold hover:text-gold/80 border border-gold/20 rounded-lg px-3 py-1.5">
                        + 新增時段
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── 備注欄（C方案不需要，D/R/G15/E需要）── */}
            {planCode !== 'C' && (
            <div className="border-t border-gold/10 pt-4 space-y-2">
              <label className="block text-xs text-text-muted">備注 / 想問的問題（選填）</label>
              <textarea
                maxLength={300}
                rows={3}
                placeholder="有什麼想特別告訴命理師的事、或想請系統重點分析的問題，請在這裡填寫..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none placeholder:text-text-muted/40"
              />
              <p className="text-[10px] text-text-muted/50 text-right">{customerNote.length}/300</p>
            </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            {/* 下一步說明 */}
            <div className="border-t border-gold/10 pt-4 mt-4">
              <p className="text-xs text-text-muted mb-2 font-semibold">付款後會發生什麼？</p>
              <div className="space-y-1.5 text-[11px] text-text-muted/70">
                <p>1. 跳轉至 Stripe 安全付款頁面完成付款</p>
                <p>2. 系統自動開始為您排盤運算與 AI 深度分析</p>
                <p>3. 完整報告平均需 30 分鐘以上{['E1', 'E2'].includes(planCode) ? '，出門訣需 40 分鐘以上' : ''}</p>
                <p>4. 完成後寄送 Email 通知，也可在儀表板即時查看</p>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {loading ? '跳轉付款中...' : `確認付款`}
            </button>

            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理，您的信用卡資訊不會經過鑑源伺服器
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
