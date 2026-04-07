import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '帳號 — 鑒源 JianYuan',
  description: '登入或註冊鑒源帳號，開始你的命理探索之旅。',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
