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
            previousBirthData={ctx.previousBirthData}
            importedPrevious={ctx.importedPrevious}
            importPreviousData={ctx.importPreviousData}
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
