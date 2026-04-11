'use client'
import { useEffect } from 'react'

// 報告瀏覽追蹤元件
// 載入後自動記錄一次瀏覽事件，5 分鐘內同一 token 不重複計算

interface ReportTrackerProps {
  reportId: string
  planCode: string
  token: string
}

export default function ReportTracker({ reportId, planCode, token }: ReportTrackerProps) {
  useEffect(() => {
    const storageKey = `report_viewed_${token}`
    const lastViewed = sessionStorage.getItem(storageKey)
    const now = Date.now()

    // 5 分鐘內不重複記錄
    if (lastViewed && now - parseInt(lastViewed, 10) < 5 * 60 * 1000) {
      return
    }

    sessionStorage.setItem(storageKey, now.toString())

    fetch('/api/report-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: reportId,
        plan_code: planCode,
        event_type: 'view',
      }),
    }).catch(() => {
      // 追蹤失敗不影響使用者體驗
    })
  }, [reportId, planCode, token])

  return null
}
