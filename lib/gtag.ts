// Google Analytics 4 事件追蹤工具
// 環境變數 NEXT_PUBLIC_GA_MEASUREMENT_ID 設定 GA4 追蹤碼

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

// 頁面瀏覽追蹤
export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).gtag?.('config', GA_MEASUREMENT_ID, { page_path: url })
}

// 自訂事件追蹤
export function event(action: string, params?: Record<string, string | number>) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).gtag?.('event', action, params)
}
