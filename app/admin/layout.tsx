'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'

// 全域 Admin 認證 Context
const AdminAuthContext = createContext<{ authed: boolean; adminKey: string; setAuthed: (v: boolean) => void; setAdminKey: (k: string) => void }>({
  authed: false, adminKey: '', setAuthed: () => {}, setAdminKey: () => {},
})

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}

const NAV_ITEMS = [
  { label: '總覽', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { label: '訂單管理', href: '/admin/orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: '用戶管理', href: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197' },
  { label: '報告管理', href: '/admin/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: '優惠碼', href: '/admin/coupons', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
  { label: '系統監控', href: '/admin/system', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  // 嘗試從 sessionStorage 恢復
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_key')
    if (saved) {
      setAdminKey(saved)
      setAuthed(true)
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?key=${keyInput}&range=7d`)
      if (res.ok) {
        setAdminKey(keyInput)
        setAuthed(true)
        sessionStorage.setItem('admin_key', keyInput)
      } else {
        alert('密碼錯誤')
      }
    } catch { alert('連線失敗') }
    finally { setLoading(false) }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="bg-[#1a1a1a] rounded-2xl p-8 w-full max-w-sm border border-white/10">
          <h1 className="text-xl font-bold text-white mb-2">鑒源管理後台</h1>
          <p className="text-sm text-gray-400 mb-6">請輸入管理密碼</p>
          <input type="password" placeholder="密碼" value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 focus:border-amber-500 focus:outline-none" />
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500 disabled:opacity-50">
            {loading ? '驗證中...' : '進入後台'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminAuthContext.Provider value={{ authed, adminKey, setAuthed, setAdminKey }}>
      <div className="min-h-screen flex" style={{ background: '#0f0f0f', color: '#e5e5e5' }}>
        {/* 側邊導航 */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-56'} shrink-0 border-r border-white/5 bg-[#141414] transition-all duration-200 flex flex-col max-md:hidden`}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            {!sidebarCollapsed && <span className="text-sm font-bold text-amber-400">鑒源後台</span>}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-500 hover:text-white p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={sidebarCollapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
              </svg>
            </button>
          </div>
          <nav className="flex-1 py-2">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <a key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                    active ? 'text-amber-400 bg-amber-500/10 border-r-2 border-amber-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d={item.icon} />
                  </svg>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </a>
              )
            })}
          </nav>
          <div className="p-4 border-t border-white/5">
            <button onClick={() => { setAuthed(false); setAdminKey(''); sessionStorage.removeItem('admin_key') }}
              className={`text-xs text-gray-500 hover:text-red-400 ${sidebarCollapsed ? 'text-center w-full' : ''}`}>
              {sidebarCollapsed ? 'X' : '登出'}
            </button>
          </div>
        </aside>

        {/* 主內容 */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* 手機版底部導航 */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-white/10 flex justify-around py-2 z-50">
          {NAV_ITEMS.slice(0, 5).map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <a key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${active ? 'text-amber-400' : 'text-gray-500'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </a>
            )
          })}
        </nav>
      </div>
    </AdminAuthContext.Provider>
  )
}
