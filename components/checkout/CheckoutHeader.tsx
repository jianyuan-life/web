'use client'

import PriceTag from '@/components/PriceTag'
import { PLAN_DESCRIPTIONS } from './types'

interface CheckoutHeaderProps {
  planCode: string
  planName: string
  isFamilyPlan: boolean
  isRelationPlan: boolean
  extraMemberCount: number
  extraPrice: number
  rExtraCount: number
  familyCount: number
  rCount: number
  totalPrice: number
  finalPrice: number
  couponApplied: { discountAmount: number } | null
  planSystems: number
}

export default function CheckoutHeader({
  planCode, planName, isFamilyPlan, isRelationPlan,
  extraMemberCount, extraPrice, rExtraCount,
  familyCount, rCount,
  totalPrice, finalPrice, couponApplied, planSystems,
}: CheckoutHeaderProps) {
  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-2">
        <span className="text-gradient-gold">確認訂單</span>
      </h1>
      <p className="text-center text-text-muted mb-6">{PLAN_DESCRIPTIONS[planCode] || '填寫出生資料，完成付款後自動生成報告'}</p>

      {/* 安全保證 */}
      <div className="flex flex-wrap justify-center gap-4 mb-8 text-[10px] text-text-muted/60">
        <span className="flex items-center gap-1"><span className="text-green-400">&#9679;</span> SSL 加密傳輸</span>
        <span className="flex items-center gap-1"><span className="text-green-400">&#9679;</span> Stripe 安全付款</span>
        <span className="flex items-center gap-1"><span className="text-green-400">&#9679;</span> 資料隱私保護</span>
      </div>

      {/* 方案摘要 */}
      <div className="glass rounded-xl p-5 mb-8 flex justify-between items-center">
        <div>
          <div className="text-xs text-gold font-mono">方案 {planCode}</div>
          <div className="text-lg font-bold text-white">{planName}</div>
          <div className="text-xs text-text-muted">
            {isFamilyPlan
              ? `基礎 2 人 $159，每加一人 +$${extraPrice}`
              : isRelationPlan
              ? '含兩人分析，每加1人 +$19/人'
              : `${planSystems} 套系統分析`}
          </div>
          {isFamilyPlan && extraMemberCount > 0 && (
            <div className="text-xs text-gold mt-1">
              目前 {familyCount} 人，額外 {extraMemberCount} 人 × ${extraPrice} = +${extraMemberCount * extraPrice}
            </div>
          )}
          {isRelationPlan && rExtraCount > 0 && (
            <div className="text-xs text-gold mt-1">
              目前 {rCount} 人，額外 {rExtraCount} 人 × $19 = +${rExtraCount * 19}
            </div>
          )}
        </div>
        <div className="text-right">
          {couponApplied && (
            <div className="text-xs text-green-400 line-through mb-0.5">${totalPrice}</div>
          )}
          <PriceTag usd={finalPrice} size="lg" />
          {couponApplied && finalPrice === 0 && (
            <div className="text-xs text-green-400 font-bold mt-0.5">免費體驗</div>
          )}
        </div>
      </div>
    </>
  )
}
