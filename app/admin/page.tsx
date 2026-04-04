'use client'

import { useEffect, useState } from 'react'

type Coupon = {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed' | 'free'
  discount_value: number
  applicable_plans: string[] | null
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  note: string
  created_at: string
}

type AdminData = {
  range: string
  overview: {
    unique_visitors: number; total_pageviews: number; total_orders: number
    completed_reports: number; total_revenue_usd: number
    free_tool_usage: number; conversion_rate_pct: number
  }
  top_products: { plan: string; count: number; revenue: number }[]
  top_pages: { path: string; count: number }[]
  geo_distribution: { country: string; count: number; pct: number }[]
  device_distribution: Record<string, number>
  recent_orders: { id: string; client_name: string; plan_code: string; amount_usd: number; status: string; created_at: string }[]
}

const PAGE_NAMES: Record<string, string> = {
  '/': '首頁',
  '/pricing': '方案與定價',
  '/tools/bazi': '免費命理速算',
  '/checkout': '結帳頁',
  '/auth/login': '登入',
  '/auth/signup': '註冊',
  '/dashboard': '用戶儀表板',
  '/dashboard/orders': '我的訂單',
  '/dashboard/settings': '帳號設定',
  '/privacy': '隱私政策',
  '/terms': '使用條款',
  '/report': '報告查閱',
  '/test': '測試頁',
  '/admin': '管理後台',
}

const PLAN_NAMES: Record<string, string> = {
  C:'人生藍圖', D:'心之所惑', G15:'家族藍圖', R:'合否？',
  E1:'事件出門訣', E2:'月盤出門訣',
}

const COUNTRY_NAMES: Record<string, string> = {
  TW:'台灣', HK:'香港', CN:'中國', JP:'日本', SG:'新加坡', US:'美國',
  MY:'馬來西亞', AU:'澳洲', CA:'加拿大', GB:'英國', KR:'韓國',
  DE:'德國', FR:'法國', NL:'荷蘭', PL:'波蘭', IT:'義大利', ES:'西班牙',
  CH:'瑞士', SE:'瑞典', NO:'挪威', DK:'丹麥', FI:'芬蘭', BE:'比利時',
  PT:'葡萄牙', AT:'奧地利', NZ:'紐西蘭', IN:'印度', TH:'泰國', PH:'菲律賓',
  ID:'印尼', VN:'越南', MX:'墨西哥', BR:'巴西', ZA:'南非', AE:'阿聯酋',
  '':'未知',
}

const PLAN_OPTIONS = ['C', 'D', 'G15', 'R', 'E1', 'E2']
const PLAN_LABELS: Record<string, string> = { C:'人生藍圖', D:'心之所惑', G15:'家族藍圖', R:'合否？', E1:'事件出門訣', E2:'月盤出門訣' }

function generateCode(prefix = 'JY') {
  return `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [range, setRange] = useState('7d')
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)

  // 優惠碼管理
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponLoading, setCouponLoading] = useState(false)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [newCoupon, setNewCoupon] = useState({
    code: '', discount_type: 'percentage' as 'percentage' | 'fixed' | 'free',
    discount_value: 20, applicable_plans: [] as string[],
    max_uses: '', expires_at: '', note: '',
  })

  const fetchCoupons = async (k: string) => {
    setCouponLoading(true)
    try {
      const res = await fetch(`/api/admin/coupons?key=${k}`)
      if (res.ok) { const d = await res.json(); setCoupons(d.coupons || []) }
    } finally { setCouponLoading(false) }
  }

  const createCoupon = async () => {
    if (!newCoupon.code && !confirm('未填優惠碼，將自動生成')) return
    const code = newCoupon.code || generateCode()
    const res = await fetch(`/api/admin/coupons?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_type === 'free' ? 0 : Number(newCoupon.discount_value),
        applicable_plans: newCoupon.applicable_plans,
        max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null,
        expires_at: newCoupon.expires_at || null,
        note: newCoupon.note,
      }),
    })
    const d = await res.json()
    if (d.coupon) {
      setCoupons(prev => [d.coupon, ...prev])
      setShowCouponForm(false)
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 20, applicable_plans: [], max_uses: '', expires_at: '', note: '' })
    } else { alert(d.error || '建立失敗') }
  }

  const toggleCoupon = async (id: string) => {
    const res = await fetch(`/api/admin/coupons?key=${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'toggle' }),
    })
    if (res.ok) fetchCoupons(key)
  }

  const deleteCoupon = async (id: string, code: string) => {
    if (!confirm(`確定刪除優惠碼 ${code}？`)) return
    await fetch(`/api/admin/coupons?key=${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete' }),
    })
    setCoupons(prev => prev.filter(c => c.id !== id))
  }

  const fetchData = async (r: string, k: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?key=${k}&range=${r}`)
      if (res.ok) {
        setData(await res.json())
        setAuthed(true)
        fetchCoupons(k)
      } else {
        alert('密碼錯誤')
      }
    } catch { alert('載入失敗') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (authed) fetchData(range, key)
  }, [range]) // eslint-disable-line

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="bg-[#1a1a1a] rounded-2xl p-8 w-full max-w-sm border border-white/10">
          <h1 className="text-xl font-bold text-white mb-2">鑒源管理後台</h1>
          <p className="text-sm text-gray-400 mb-6">請輸入管理密碼</p>
          <input type="password" placeholder="密碼" value={key} onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData(range, key)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 focus:border-amber-500 focus:outline-none" />
          <button onClick={() => fetchData(range, key)}
            className="w-full py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500">
            進入後台
          </button>
        </div>
      </div>
    )
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}><p className="text-gray-400">載入中...</p></div>

  const o = data.overview

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', color: '#e5e5e5' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">鑒源管理後台</h1>
            <p className="text-sm text-gray-500">JianYuan Admin Dashboard</p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${range === r ? 'bg-amber-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {r === '7d' ? '7天' : r === '30d' ? '30天' : '90天'}
              </button>
            ))}
            <button onClick={() => fetchData(range, key)} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400 hover:bg-white/10">
              {loading ? '...' : '刷新'}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {[
            { label: '訪客數', value: o.unique_visitors, color: 'text-blue-400' },
            { label: '瀏覽量', value: o.total_pageviews, color: 'text-cyan-400' },
            { label: '免費速算', value: o.free_tool_usage, color: 'text-purple-400' },
            { label: '訂單數', value: o.total_orders, color: 'text-green-400' },
            { label: '完成報告', value: o.completed_reports, color: 'text-emerald-400' },
            { label: '營收 USD', value: `$${o.total_revenue_usd}`, color: 'text-amber-400' },
            { label: '轉化率', value: `${o.conversion_rate_pct}%`, color: 'text-rose-400' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
              <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 產品銷售排行 */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-4">產品銷售排行</h3>
            {data.top_products.length > 0 ? (
              <div className="space-y-3">
                {data.top_products.map((p, i) => (
                  <div key={p.plan} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-white">{PLAN_NAMES[p.plan] || `方案${p.plan}`}</span>
                        <span className="text-sm text-amber-400">${p.revenue}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-600 rounded-full" style={{ width: `${Math.min(p.revenue / Math.max(data.top_products[0]?.revenue || 1, 1) * 100, 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{p.count} 單</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">暫無訂單數據</p>}
          </div>

          {/* 客戶地理分佈 */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-4">客戶地理分佈</h3>
            {data.geo_distribution.length > 0 ? (
              <div className="space-y-3">
                {data.geo_distribution.slice(0, 10).map((g, i) => (
                  <div key={g.country} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-white">{COUNTRY_NAMES[g.country] || g.country || '未知'}</span>
                        <span className="text-xs text-gray-400">{g.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${g.pct}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{g.count} 次訪問</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">暫無訪客數據</p>}
          </div>

          {/* 熱門頁面 */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-4">熱門頁面 Top 10</h3>
            {data.top_pages.length > 0 ? (
              <div className="space-y-2">
                {data.top_pages.map((p, i) => (
                  <div key={p.path} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                      <div>
                        <span className="text-sm text-gray-300">{PAGE_NAMES[p.path] || p.path}</span>
                        <span className="text-xs text-gray-600 ml-2 font-mono">{p.path}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{p.count} 次</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">暫無頁面數據</p>}
          </div>

          {/* 設備分佈 */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-4">設備分佈</h3>
            <div className="space-y-3">
              {Object.entries(data.device_distribution).map(([device, count]) => {
                const total = Object.values(data.device_distribution).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round(count / total * 100) : 0
                const icon = device === 'mobile' ? '📱' : device === 'tablet' ? '📟' : '💻'
                const label = device === 'mobile' ? '手機' : device === 'tablet' ? '平板' : '桌面'
                return (
                  <div key={device} className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-white">{label}</span>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              {Object.keys(data.device_distribution).length === 0 && <p className="text-sm text-gray-500">暫無設備數據</p>}
            </div>
          </div>
        </div>

        {/* 最近訂單 */}
        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-4">最近訂單</h3>
          {data.recent_orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-white/5">
                    <th className="text-left py-2 pr-4">客戶</th>
                    <th className="text-left py-2 pr-4">方案</th>
                    <th className="text-right py-2 pr-4">金額</th>
                    <th className="text-left py-2 pr-4">狀態</th>
                    <th className="text-left py-2">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map(order => (
                    <tr key={order.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pr-4 text-white">{order.client_name}</td>
                      <td className="py-2.5 pr-4 text-gray-400">{PLAN_NAMES[order.plan_code] || `方案${order.plan_code}`}</td>
                      <td className="py-2.5 pr-4 text-right text-amber-400">${order.amount_usd}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-green-500/20 text-green-400' : order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {order.status === 'completed' ? '已完成' : order.status === 'pending' ? '處理中' : '失敗'}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">{new Date(order.created_at).toLocaleString('zh-TW')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-500">暫無訂單</p>}
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* 優惠碼管理 */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="mt-8 bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">優惠碼管理</h3>
            <button onClick={() => setShowCouponForm(v => !v)}
              className="px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-500">
              + 新增優惠碼
            </button>
          </div>

          {/* 新增表單 */}
          {showCouponForm && (
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">優惠碼（留空自動生成）</label>
                  <div className="flex gap-2">
                    <input value={newCoupon.code} onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="例：VIP2026" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                    <button type="button" onClick={() => setNewCoupon(p => ({ ...p, code: generateCode() }))}
                      className="px-3 py-2 bg-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/20 whitespace-nowrap">自動</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">折扣類型</label>
                  <select value={newCoupon.discount_type} onChange={e => setNewCoupon(p => ({ ...p, discount_type: e.target.value as 'percentage' | 'fixed' | 'free' }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                    <option value="percentage">百分比折扣（%）</option>
                    <option value="fixed">固定折抵金額（$）</option>
                    <option value="free">完全免費</option>
                  </select>
                </div>
                {newCoupon.discount_type !== 'free' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      {newCoupon.discount_type === 'percentage' ? '折扣比例（%）' : '折抵金額（USD）'}
                    </label>
                    <input type="number" value={newCoupon.discount_value}
                      onChange={e => setNewCoupon(p => ({ ...p, discount_value: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">使用次數上限（留空=無限）</label>
                  <input type="number" value={newCoupon.max_uses} placeholder="留空=無限"
                    onChange={e => setNewCoupon(p => ({ ...p, max_uses: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">到期日（留空=永不過期）</label>
                  <input type="date" value={newCoupon.expires_at}
                    onChange={e => setNewCoupon(p => ({ ...p, expires_at: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">備注（僅自己看）</label>
                  <input value={newCoupon.note} onChange={e => setNewCoupon(p => ({ ...p, note: e.target.value }))}
                    placeholder="例：給VIP朋友的試用" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">適用方案（不選=全部方案適用）</label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_OPTIONS.map(p => (
                    <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={newCoupon.applicable_plans.includes(p)}
                        onChange={e => setNewCoupon(prev => ({
                          ...prev,
                          applicable_plans: e.target.checked
                            ? [...prev.applicable_plans, p]
                            : prev.applicable_plans.filter(x => x !== p)
                        }))} className="accent-amber-500" />
                      <span className="text-xs text-gray-300">{p} {PLAN_LABELS[p]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createCoupon} className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-500">建立優惠碼</button>
                <button onClick={() => setShowCouponForm(false)} className="px-4 py-2 bg-white/10 text-gray-300 text-sm rounded-lg hover:bg-white/20">取消</button>
              </div>
            </div>
          )}

          {/* 優惠碼列表 */}
          {couponLoading ? (
            <p className="text-sm text-gray-500">載入中...</p>
          ) : coupons.length === 0 ? (
            <p className="text-sm text-gray-500">尚無優惠碼</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-white/5">
                    <th className="text-left py-2 pr-3">優惠碼</th>
                    <th className="text-left py-2 pr-3">折扣</th>
                    <th className="text-left py-2 pr-3">適用方案</th>
                    <th className="text-center py-2 pr-3">已用/上限</th>
                    <th className="text-left py-2 pr-3">到期</th>
                    <th className="text-left py-2 pr-3">備注</th>
                    <th className="text-center py-2 pr-3">狀態</th>
                    <th className="text-center py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-amber-400 font-bold">{c.code}</td>
                      <td className="py-2.5 pr-3 text-white">
                        {c.discount_type === 'free' ? '完全免費' :
                         c.discount_type === 'percentage' ? `${c.discount_value}% 折扣` :
                         `$${c.discount_value} 折抵`}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-400 text-xs">
                        {c.applicable_plans?.length ? c.applicable_plans.join(', ') : '全部方案'}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className={c.max_uses !== null && c.used_count >= c.max_uses ? 'text-red-400' : 'text-gray-300'}>
                          {c.used_count} / {c.max_uses ?? '∞'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-400">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString('zh-TW') : '永不'}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-500 max-w-[120px] truncate">{c.note || '—'}</td>
                      <td className="py-2.5 pr-3 text-center">
                        <button onClick={() => toggleCoupon(c.id)}
                          className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {c.is_active ? '啟用中' : '已停用'}
                        </button>
                      </td>
                      <td className="py-2.5 text-center">
                        <button onClick={() => deleteCoupon(c.id, c.code)} className="text-xs text-red-400 hover:text-red-300">刪除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">鑒源 JianYuan 管理後台 | 數據每次刷新即時更新</p>
      </div>
    </div>
  )
}
