import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '免費命理速算 — 鑒源 JianYuan',
  description: '免費體驗鑒源命理速算：輸入生辰八字，即時獲得八字五行、日主強弱、十神分析。融合15大命理系統的命理分析平台。',
  keywords: '免費算命, 八字速算, 生辰八字分析, 五行分析, 日主強弱, 免費命理',
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children
}
