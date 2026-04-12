// Meta Pixel (Facebook Pixel) 事件追蹤工具
// 環境變數 NEXT_PUBLIC_META_PIXEL_ID 設定 Pixel ID，沒設就不載入

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''

// 追蹤標準事件
export function trackEvent(eventName: string, params?: Record<string, string | number>) {
  if (!META_PIXEL_ID || typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).fbq?.('track', eventName, params)
}

// 追蹤自訂事件
export function trackCustomEvent(eventName: string, params?: Record<string, string | number>) {
  if (!META_PIXEL_ID || typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).fbq?.('trackCustom', eventName, params)
}
