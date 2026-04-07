import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '我的報告 — 鑒源 JianYuan',
  description: '查看和下載您的命理報告。',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
