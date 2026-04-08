'use client'

import { Suspense } from 'react'
import { useCheckoutForm } from '@/hooks/useCheckoutForm'
import CheckoutHeader from '@/components/checkout/CheckoutHeader'
import CouponInput from '@/components/checkout/CouponInput'
import SinglePersonForm from '@/components/checkout/SinglePersonForm'
import RMemberForm from '@/components/checkout/RMemberForm'
import FamilyMemberField from '@/components/checkout/FamilyMemberField'
import CustomerNote from '@/components/checkout/CustomerNote'

function CheckoutForm() {
  const ctx = useCheckoutForm()

  if (!ctx.authChecked) {
    return <div className="py-20 text-center text-text-muted">驗證登入狀態...</div>
  }

  return (
    <div className="py-20">
      <div className="max-w-2xl mx-auto px-6">
        <CheckoutHeader
          planCode={ctx.planCode}
          planName={ctx.plan.name}
          isFamilyPlan={ctx.isFamilyPlan}
          isRelationPlan={ctx.isRelationPlan}
          isG15Plan={ctx.isG15Plan}
          extraMemberCount={ctx.extraMemberCount}
          extraPrice={ctx.extraPrice}
          rExtraCount={ctx.rExtraCount}
          familyCount={ctx.familyMembers.length}
          rCount={ctx.rMembers.length}
          totalPrice={ctx.totalPrice}
          finalPrice={ctx.finalPrice}
          couponApplied={ctx.couponApplied}
          planSystems={ctx.plan.systems}
        />

        <CouponInput
          couponInput={ctx.couponInput}
          setCouponInput={ctx.setCouponInput}
          couponApplied={ctx.couponApplied}
          setCouponApplied={() => ctx.setCouponApplied(null)}
          couponLoading={ctx.couponLoading}
          couponError={ctx.couponError}
          setCouponError={ctx.setCouponError}
          applyCoupon={ctx.applyCoupon}
        />

        {/* R 方案多人表單 */}
        {ctx.isRelationPlan ? (
          <RMemberForm
            rMembers={ctx.rMembers}
            updateRMember={ctx.updateRMember}
            addRMember={ctx.addRMember}
            removeRMember={ctx.removeRMember}
            rRelationDesc={ctx.rRelationDesc}
            setRRelationDesc={ctx.setRRelationDesc}
            customerNote={ctx.customerNote}
            setCustomerNote={ctx.setCustomerNote}
            loading={ctx.loading}
            error={ctx.error}
            finalPrice={ctx.finalPrice}
            onSubmit={ctx.handleCheckout}
          />
        ) : ctx.isG15Plan ? (
          /* G15 家族藍圖：email 驗證表單 */
          <form onSubmit={ctx.handleCheckout} className="space-y-4">
            <div className="glass rounded-xl p-4 mb-2">
              <p className="text-sm text-text-muted leading-relaxed">
                請輸入每位家庭成員購買「人生藍圖」時使用的 Email。系統會自動讀取已完成的報告資料，
                進行家族互動分析。每位成員需先購買人生藍圖（$89）。
              </p>
            </div>

            <div className="space-y-3">
              {ctx.g15Emails.map((entry, index) => (
                <div key={index} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gold">
                      家庭成員 {index + 1}
                    </span>
                    {index >= 2 && (
                      <button
                        type="button"
                        onClick={() => ctx.removeG15Email(index)}
                        className="text-red-400 text-xs hover:text-red-300 transition-colors"
                      >
                        移除
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={entry.email}
                      onChange={(e) => ctx.updateG15Email(index, e.target.value)}
                      className="flex-1 bg-dark-lighter border border-gold/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-text-muted/40 focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>
                  {/* 驗證結果 */}
                  {entry.verified && (
                    <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs">
                      <span>&#10003;</span>
                      <span>已驗證 — {entry.name || '已找到報告'}</span>
                    </div>
                  )}
                  {entry.errorMsg && (
                    <div className="mt-2 text-red-400 text-xs">
                      {entry.errorMsg}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {ctx.g15Emails.length < 8 && (
              <button
                type="button"
                onClick={ctx.addG15Email}
                className="w-full py-3 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/10 transition-all"
              >
                + 加入第 {ctx.g15Emails.length + 1} 位家庭成員
              </button>
            )}

            {ctx.error && <p className="text-red-400 text-sm text-center">{ctx.error}</p>}

            <button
              type="submit"
              disabled={ctx.loading || ctx.g15VerifyLoading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {ctx.g15VerifyLoading ? '驗證成員資料中...' : ctx.loading ? '跳轉付款中...' : `確認付款 — $${ctx.finalPrice}`}
            </button>
            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理。報告平均需 30 分鐘以上。
            </p>
          </form>
        ) : ctx.isFamilyPlan ? (
          /* 家庭方案表單 */
          <form onSubmit={ctx.handleCheckout} className="space-y-4">
            <div className="space-y-4">
              {ctx.familyMembers.map((member, index) => (
                <FamilyMemberField
                  key={index}
                  index={index}
                  member={member}
                  canDelete={index >= 2}
                  onChange={(updated) => ctx.updateFamilyMember(index, updated)}
                  onDelete={() => ctx.removeFamilyMember(index)}
                />
              ))}
            </div>

            {ctx.familyMembers.length < 8 && (
              <button type="button" onClick={ctx.addFamilyMember}
                className="w-full py-3 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/10 transition-all">
                + 加入第 {ctx.familyMembers.length + 1} 位家庭成員
                <span className="text-text-muted ml-2">(+${ctx.extraPrice})</span>
              </button>
            )}

            <CustomerNote customerNote={ctx.customerNote} setCustomerNote={ctx.setCustomerNote} />

            {ctx.error && <p className="text-red-400 text-sm text-center">{ctx.error}</p>}

            <button
              type="submit" disabled={ctx.loading}
              className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
            >
              {ctx.loading ? '跳轉付款中...' : ctx.finalPrice === 0 ? '免費領取報告' : `確認付款 — $${ctx.finalPrice}`}
            </button>
            <p className="text-xs text-text-muted/60 text-center">
              付款由 Stripe 安全處理。報告平均需 30 分鐘以上，出門訣需 40 分鐘以上。
            </p>
          </form>
        ) : (
          /* 單人表單 */
          <SinglePersonForm
            planCode={ctx.planCode}
            form={ctx.form}
            setForm={ctx.setForm}
            timeMode={ctx.timeMode}
            setTimeMode={ctx.setTimeMode}
            cityResults={ctx.cityResults}
            onCitySearch={ctx.handleCitySearch}
            onCitySelect={ctx.selectCity}
            dTopic={ctx.dTopic}
            setDTopic={ctx.setDTopic}
            dOtherDesc={ctx.dOtherDesc}
            setDOtherDesc={ctx.setDOtherDesc}
            e1StartDate={ctx.e1StartDate}
            setE1StartDate={ctx.setE1StartDate}
            e1EndDate={ctx.e1EndDate}
            setE1EndDate={ctx.setE1EndDate}
            eSelectedBlocks={ctx.eSelectedBlocks}
            setESelectedBlocks={ctx.setESelectedBlocks}
            customerNote={ctx.customerNote}
            setCustomerNote={ctx.setCustomerNote}
            loading={ctx.loading}
            error={ctx.error}
            finalPrice={ctx.finalPrice}
            onSubmit={ctx.handleCheckout}
          />
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-text-muted">載入中...</div>}>
      <CheckoutForm />
    </Suspense>
  )
}
