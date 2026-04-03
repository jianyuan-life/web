'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ReportProgress from '@/components/ReportProgress'

const PLAN_NAMES: Record<string, string> = {
  C: '人生藍圖', D: '心之所惑',
  G15: '家族藍圖', R: '合否？',
  E1: '事件出門訣', E2: '月盤出門訣',
}

type Report = {
  id: string
  client_name: string
  plan_code: string
  amount_usd: number
  status: string
  pdf_url: string | null
  access_token: string | null
  report_result: {
    systems_count?: number
    analyses_summary?: { system: string; score: number }[]
  } | null
  created_at: string
}

function DashboardContent() {
  const params = useSearchParams()
  const paymentSuccess = params.get('payment') === 'success'

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    // 先樂觀更新 UI + 記錄已刪除 ID（防止輪詢把它塞回來）
    setDeletedIds(prev => new Set(prev).add(id))
    setReports(prev => prev.filter(r => r.id !== id))
    try {
      await fetch('/api/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      // 刪除失敗：從記錄中移除，讓報告重新出現
      setDeletedIds(prev => { const s = new Set(prev); s.delete(id); return s })
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => {
        setReports(data.reports || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // 付款成功後輪詢等待報告生成
  useEffect(() => {
    if (!paymentSuccess) return
    const interval = setInterval(() => {
      fetch('/api/reports')
        .then(r => r.json())
        .then(data => {
          const newReports = (data.reports || []).filter(
            (r: Report) => !deletedIds.has(r.id)
          )
          setReports(newReports)
          // 如果最新報告是 completed，停止輪詢
          if (newReports.length > 0 && newReports[0].status === 'completed') {
            clearInterval(interval)
          }
        })
    }, 5000)
    return () => clearInterval(interval)
  }, [paymentSuccess, deletedIds])

  const avgScore = (report: Report) => {
    const summary = report.report_result?.analyses_summary
    if (!summary || summary.length === 0) return 0
    return Math.round(summary.reduce((a, b) => a + b.score, 0) / summary.length)
  }

  return (
    <div className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* 付款成功提示 */}
        {paymentSuccess && (
          <div className="glass rounded-xl p-5 mb-6 border-l-2 border-green-500/50">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-xl">&#10003;</span>
              <div>
                <p className="text-cream font-semibold">付款成功，命理分析啟動中</p>
                <p className="text-sm text-text-muted">
                  系統已開始為您進行命理排盤與 AI 深度解析。
                  <strong className="text-gold/80"> 每位成員的完整報告平均需要 30 分鐘以上，出門訣計算需 40 分鐘以上</strong>，
                  請耐心等候——我們寧可多花時間，也要確保每份報告的準確性與深度。
                  完成後請刷新此頁面查看報告。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-cream" style={{ fontFamily: 'var(--font-sans)' }}>我的報告</h1>
            <p className="text-sm text-text-muted">查看和下載已生成的命理報告</p>
          </div>
          <a href="/pricing" className="px-4 py-2 bg-gold text-dark font-semibold rounded-lg text-sm btn-glow">
            + 新報告
          </a>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-8 h-8 border-2 border-gold/50 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">載入中...</p>
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="glass rounded-xl p-5 transition-all hover:border-gold/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center text-gold font-bold text-lg" style={{ fontFamily: 'var(--font-sans)' }}>
                      {r.client_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-cream">{r.client_name}</h3>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        <span>{PLAN_NAMES[r.plan_code] || `方案 ${r.plan_code}`}</span>
                        <span>{r.report_result?.systems_count || 15} 套系統</span>
                        <span>${r.amount_usd}</span>
                        <span>{new Date(r.created_at).toLocaleDateString('zh-TW')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.status === 'completed' ? (
                      <>
                        {avgScore(r) > 0 && (
                          <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-gold">{avgScore(r)}/100</div>
                            <div className="text-xs text-text-muted">綜合評分</div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {r.access_token && (
                            <a href={`/report/${r.access_token}`}
                              className="px-3 py-1.5 bg-gold/15 border border-gold/30 rounded-lg text-xs text-gold hover:bg-gold/25 transition-colors font-medium">
                              查看報告
                            </a>
                          )}
                          {r.pdf_url && (
                            <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 glass rounded-lg text-xs text-gold hover:bg-gold/10 transition-colors">
                              下載 PDF
                            </a>
                          )}
                        </div>
                      </>
                    ) : r.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gold/50 border-t-gold rounded-full animate-spin" />
                        <span className="text-xs text-gold/70">分析中</span>
                      </div>
                    ) : (
                      <span className="text-xs text-red-400">生成失敗</span>
                    )}
                    {/* 刪除按鈕 */}
                    <button
                      onClick={() => setConfirmId(confirmId === r.id ? null : r.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="刪除報告"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {/* pending 時顯示進度條 */}
                {r.status === 'pending' && (
                  <ReportProgress createdAt={r.created_at} planCode={r.plan_code} />
                )}
                {/* 刪除確認 */}
                {confirmId === r.id && (
                  <div className="mt-3 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-red-300">確定要刪除這份報告嗎？此操作無法復原。</span>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-1 text-xs text-text-muted border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="px-3 py-1 text-xs text-white bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                      >
                        {deletingId === r.id ? '刪除中...' : '確認刪除'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4" style={{ fontFamily: 'var(--font-sans)' }}>&#9788;</div>
            <h3 className="text-lg font-semibold text-cream mb-2">還沒有報告</h3>
            <p className="text-sm text-text-muted mb-6">選擇一個方案，開始你的命理探索之旅</p>
            <a href="/tools/bazi" className="px-6 py-2.5 bg-gold text-dark font-semibold rounded-lg btn-glow">
              先免費體驗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-muted">載入中...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
