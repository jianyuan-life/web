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

function CheckoutForm() {
  const params = useSearchParams()
  const planCode = params.get('plan') || 'C'
  const plan = PLANS[planCode] || PLANS.C

  const [form, setForm] = useState({
    name: '', year: '1990', month: '1', day: '1', hour: '12', minute: '0',
    gender: 'M', address: '', addressLat: 0, addressLng: 0,
    birthCity: '', cityLat: 0, cityLng: 0, cityTz: 8,
  })
  const [timeMode, setTimeMode] = useState<'unknown' | 'shichen' | 'exact'>('shichen')
  const [cityResults, setCityResults] = useState<City[]>([])
  const [addressResults, setAddressResults] = useState<{ label: string; lat: number; lng: number }[]>([])
  const [addressSearchTimer, setAddressSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

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

  // Auth guard: 沒登入就跳走
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        sessionStorage.setItem('pending_plan', planCode)
        window.location.href = '/auth/login'
      } else {
        // 自動填入用戶名稱
        const fullName = data.user.user_metadata?.full_name || ''
        if (fullName) setForm(f => ({ ...f, name: fullName }))
        setAuthChecked(true)
      }
    })
  }, [planCode])

  if (!authChecked) {
    return <div className="py-20 text-center text-text-muted">驗證登入狀態...</div>
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { alert('請輸入姓名'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode,
          birthData: {
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
          },
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

  return (
    <div className="py-20">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-gradient-gold">確認訂單</span>
        </h1>
        <p className="text-center text-text-muted mb-10">填寫出生資料，完成付款後自動生成報告</p>

        {/* 方案摘要 */}
        <div className="glass rounded-xl p-5 mb-8 flex justify-between items-center">
          <div>
            <div className="text-xs text-gold font-mono">方案 {planCode}</div>
            <div className="text-lg font-bold text-white">{plan.name}</div>
            <div className="text-xs text-text-muted">{plan.systems} 套系統分析</div>
          </div>
          <PriceTag usd={plan.price} size="lg" />
        </div>

        {/* 出生資料表單 */}
        <form onSubmit={handleCheckout} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">姓名 *</label>
            <input
              type="text" required placeholder="請輸入您的全名"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none"
            />
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
              <label className="block text-xs text-text-muted mb-1">月</label>
              <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">日</label>
              <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">出生時間</label>
            {/* 三模式切換 */}
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
              <select value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                {SHICHEN.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}

            {timeMode === 'exact' && (
              <div className="flex gap-3">
                <select value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })}
                  className="flex-1 bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}時</option>
                  ))}
                </select>
                <select value={form.minute} onChange={(e) => setForm({ ...form, minute: e.target.value })}
                  className="flex-1 bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}分</option>
                  ))}
                </select>
              </div>
            )}
          </div>

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
