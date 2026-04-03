// ============================================================
// 多幣種系統：根據用戶地區自動切換
// ============================================================

export type CurrencyCode = 'USD' | 'TWD' | 'HKD' | 'CNY' | 'JPY'

interface CurrencyInfo {
  code: CurrencyCode
  symbol: string
  name: string
  rate: number  // 對 USD 的匯率（近似值，定期更新）
  decimals: number
}

const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'USD', rate: 1, decimals: 0 },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'TWD', rate: 32, decimals: 0 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'HKD', rate: 7.8, decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'CNY', rate: 7.2, decimals: 0 },
  JPY: { code: 'JPY', symbol: '¥', name: 'JPY', rate: 150, decimals: 0 },
}

// 根據時區或語言猜測地區
function detectCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD'

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const lang = navigator.language || ''

    // 台灣
    if (tz.includes('Taipei') || lang.includes('zh-TW')) return 'TWD'
    // 香港
    if (tz.includes('Hong_Kong') || lang.includes('zh-HK')) return 'HKD'
    // 中國大陸
    if (tz.includes('Shanghai') || tz.includes('Chongqing') || lang === 'zh-CN' || lang === 'zh') return 'CNY'
    // 日本
    if (tz.includes('Tokyo') || lang.includes('ja')) return 'JPY'
    // 新加坡、馬來西亞用 USD
  } catch {
    // ignore
  }

  return 'USD'
}

let _cachedCurrency: CurrencyCode | null = null

export function getUserCurrency(): CurrencyCode {
  if (_cachedCurrency) return _cachedCurrency
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('currency') as CurrencyCode
    if (saved && CURRENCIES[saved]) {
      _cachedCurrency = saved
      return saved
    }
  }
  const detected = detectCurrency()
  _cachedCurrency = detected
  return detected
}

export function setCurrency(code: CurrencyCode) {
  _cachedCurrency = code
  if (typeof window !== 'undefined') {
    localStorage.setItem('currency', code)
  }
}

export function formatPrice(usdPrice: number, currency?: CurrencyCode): string {
  const code = currency || getUserCurrency()
  const info = CURRENCIES[code]
  const converted = Math.round(usdPrice * info.rate)
  return `${info.symbol}${converted.toLocaleString()}`
}

export function getCurrencyInfo(code?: CurrencyCode): CurrencyInfo {
  return CURRENCIES[code || getUserCurrency()]
}

export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES)
}
