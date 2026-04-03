'use client'

import { useEffect, useState } from 'react'

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
  A:'核心三合一', B:'進階六合一', C:'全方位十五合一', D:'專項深度',
  E:'出門訣', F:'寶寶取名', G:'家庭全方位', H:'投資人格KYC',
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

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [range, setRange] = useState('7d')
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchData = async (r: string, k: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?key=${k}&range=${r}`)
      if (res.ok) {
        setData(await res.json())
        setAuthed(true)
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
                        <span className="text-sm text-white">方案{p.plan} {PLAN_NAMES[p.plan] || ''}</span>
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
                      <td className="py-2.5 pr-4 text-gray-400">方案{order.plan_code} {PLAN_NAMES[order.plan_code] || ''}</td>
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

        <p className="text-center text-xs text-gray-600 mt-8">鑒源 JianYuan 管理後台 | 數據每次刷新即時更新</p>
      </div>
    </div>
  )
}
