import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '方案與定價 — 鑒源 JianYuan',
  description: '鑒源提供11種命理方案：全方位十五合一（$89）、核心三合一（$49）、專項分析（$29）、家庭方案、月/年運勢、奇門出門訣。東西方15大命理系統，AI精準分析。',
  keywords: '鑒源定價, 命理報告價格, 八字報告, 紫微斗數報告, 奇門出門訣, 家庭命理分析',
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
