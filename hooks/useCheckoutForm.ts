'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as gtag from '@/lib/gtag'
import { searchCities, type City } from '@/lib/cities'
import {
  PLANS, FAMILY_EXTRA_PRICE, D_TOPICS, TIME_BLOCKS,
  newMember, type FamilyMember,
} from '@/components/checkout/types'

export function useCheckoutForm() {
  const params = useSearchParams()
  const planCode = params.get('plan') || 'C'
  const plan = PLANS[planCode] || PLANS.C

  const [form, setForm] = useState({
    name: params.get('name') || '',
    year: params.get('year') || '1990',
    month: params.get('month') || '1',
    day: params.get('day') || '1',
    hour: params.get('hour') || '12',
    minute: params.get('minute') || '0',
    gender: params.get('gender') || 'M',
    address: '', addressLat: 0, addressLng: 0,
    birthCity: '', cityLat: 0, cityLng: 0, cityTz: 8,
    calendarType: (params.get('calendarType') || 'solar') as 'solar' | 'lunar',
    lunarLeap: false,
  })
  const [timeMode, setTimeMode] = useState<'unknown' | 'shichen' | 'exact'>(
    (params.get('timeMode') as 'unknown' | 'shichen' | 'exact') || 'shichen'
  )
  const [cityResults, setCityResults] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 優惠碼
  const [couponInput, setCouponInput] = useState('')
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountAmount: number; message: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  // 備注
  const [customerNote, setCustomerNote] = useState('')

  // 方案 D
  const [dTopic, setDTopic] = useState(D_TOPICS[0])
  const [dOtherDesc, setDOtherDesc] = useState('')

  // 方案 R
  const [rMembers, setRMembers] = useState<FamilyMember[]>([newMember(), newMember()])
  const [rRelationDesc, setRRelationDesc] = useState('')

  // 方案 G15
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([newMember(), newMember()])

  // 方案 E1
  const [e1StartDate, setE1StartDate] = useState('')
  const [e1EndDate, setE1EndDate] = useState('')

  // E1/E2 十二時辰：子丑寅卯辰巳午未申酉戌亥，預設勾選辰~酉（白天 07-19 時）
  const [eSelectedBlocks, setESelectedBlocks] = useState<boolean[]>([
    false, false, false, false, true, true, true, true, true, true, false, false
  ])

  // Auth
  const [authChecked, setAuthChecked] = useState(false)
  const [authEmail, setAuthEmail] = useState('')

  // 計算金額
  const extraMemberCount = Math.max(0, familyMembers.length - 2)
  const extraPrice = FAMILY_EXTRA_PRICE[planCode] ?? 0
  const rExtraCount = Math.max(0, rMembers.length - 2)
  const totalPrice = ['G15', 'G3'].includes(planCode)
    ? plan.price + extraMemberCount * extraPrice
    : planCode === 'R'
    ? plan.price + rExtraCount * 19
    : plan.price
  const finalPrice = couponApplied ? Math.max(0, totalPrice - couponApplied.discountAmount) : totalPrice

  const isFamilyPlan = planCode === 'G15' || planCode === 'G3'
  const isRelationPlan = planCode === 'R'

  // 優惠碼驗證
  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponApplied(null)
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponInput)}&plan=${planCode}&amount=${totalPrice}`)
      const data = await res.json()
      if (data.valid) {
        setCouponApplied({ code: couponInput.trim().toUpperCase(), discountAmount: data.discountAmount, message: data.message })
      } else {
        setCouponError(data.message || '優惠碼無效')
      }
    } catch {
      setCouponError('驗證失敗，請稍後再試')
    } finally {
      setCouponLoading(false)
    }
  }

  // 城市搜尋
  const handleCitySearch = (val: string) => {
    setForm(f => ({ ...f, birthCity: val, cityLat: 0, cityLng: 0 }))
    setCityResults(val.length >= 1 ? searchCities(val) : [])
  }

  const selectCity = (c: City) => {
    setForm(f => ({ ...f, birthCity: `${c.name}（${c.country}）`, cityLat: c.lat, cityLng: c.lng, cityTz: c.tz }))
    setCityResults([])
  }

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        sessionStorage.setItem('pending_plan', planCode)
        window.location.href = '/auth/login'
      } else {
        const fullName = data.user.user_metadata?.full_name || ''
        if (fullName && !params.get('name')) setForm(f => ({ ...f, name: fullName }))
        // 快取 email，供 dashboard 在 Stripe 重導向後使用
        if (data.user.email) {
          setAuthEmail(data.user.email)
          try { sessionStorage.setItem('jianyuan_email', data.user.email) } catch {}
        }
        setAuthChecked(true)
      }
    })
  }, [planCode])

  // 家庭成員操作
  const updateFamilyMember = (index: number, updated: FamilyMember) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? updated : m))
  }
  const addFamilyMember = () => {
    if (familyMembers.length < 8) setFamilyMembers(prev => [...prev, newMember()])
  }
  const removeFamilyMember = (index: number) => {
    if (index >= 2) setFamilyMembers(prev => prev.filter((_, i) => i !== index))
  }

  // R 方案成員操作
  const updateRMember = (index: number, updated: FamilyMember) => {
    setRMembers(prev => prev.map((m, i) => i === index ? updated : m))
  }
  const addRMember = () => {
    if (rMembers.length < 6) setRMembers(prev => [...prev, newMember()])
  }
  const removeRMember = (index: number) => {
    if (index >= 2) setRMembers(prev => prev.filter((_, i) => i !== index))
  }

  // 提交
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (['G15', 'G3'].includes(planCode)) {
      for (let i = 0; i < familyMembers.length; i++) {
        if (!familyMembers[i].name.trim()) {
          alert(`請輸入第 ${i + 1} 位成員的姓名`)
          return
        }
        const yr = parseInt(familyMembers[i].year)
        if (yr < 1900 || yr > new Date().getFullYear()) {
          alert(`第 ${i + 1} 位成員的出生年份不正確`)
          return
        }
      }
    } else {
      if (!form.name.trim()) { alert('請輸入姓名'); return }
      const yr = parseInt(form.year)
      if (yr < 1900 || yr > new Date().getFullYear()) { alert('出生年份範圍需在 1900 至今年之間'); return }
    }

    if (planCode === 'R') {
      for (let i = 0; i < rMembers.length; i++) {
        if (!rMembers[i].name.trim()) {
          alert(`請輸入${i === 0 ? '您' : `第 ${i + 1} 位當事人`}的姓名`)
          return
        }
      }
      if (!rRelationDesc.trim()) { alert('請描述你們的關係與想了解的問題'); return }
    }

    if (planCode === 'E1') {
      if (!e1StartDate || !e1EndDate) { alert('請選擇事件時間範圍'); return }
    }

    if (planCode === 'E1' || planCode === 'E2') {
      if (!eSelectedBlocks.some(b => b)) {
        alert('請至少勾選一個可配合的出行時段')
        return
      }
    }

    setLoading(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let birthData: Record<string, any> = {}

      if (['G15', 'G3'].includes(planCode)) {
        birthData = {
          plan_type: 'family',
          members: familyMembers.map(m => ({
            name: m.name,
            year: parseInt(m.year),
            month: parseInt(m.month),
            day: parseInt(m.day),
            hour: m.timeMode === 'unknown' ? 12 : parseInt(m.hour),
            minute: m.timeMode === 'exact' ? parseInt(m.minute) : 0,
            gender: m.gender,
            time_unknown: m.timeMode === 'unknown',
            time_mode: m.timeMode,
          })),
        }
      } else {
        birthData = {
          name: form.name,
          year: parseInt(form.year),
          month: parseInt(form.month),
          day: parseInt(form.day),
          hour: timeMode === 'unknown' ? 12 : parseInt(form.hour),
          minute: timeMode === 'exact' ? parseInt(form.minute) : 0,
          gender: form.gender,
          address: form.address,
          address_lat: form.addressLat || undefined,
          address_lng: form.addressLng || undefined,
          time_unknown: timeMode === 'unknown',
          time_mode: timeMode,
          latitude: form.cityLat || undefined,
          longitude: form.cityLng || undefined,
          timezone_offset: form.cityTz,
          birth_city: form.birthCity || undefined,
          calendar_type: form.calendarType,
          lunar_leap: form.calendarType === 'lunar' ? form.lunarLeap : undefined,
        }

        if (planCode === 'D') {
          birthData.analysis_topic = dTopic
          if (dTopic === '問事（其他）') birthData.other_question = dOtherDesc
        }

        if (planCode === 'R') {
          birthData = {
            plan: 'R',
            members: rMembers.map((m, i) => ({
              name: m.name,
              year: parseInt(m.year),
              month: parseInt(m.month),
              day: parseInt(m.day),
              hour: m.timeMode === 'unknown' ? 12 : parseInt(m.hour),
              minute: m.timeMode === 'exact' ? parseInt(m.minute) : 0,
              gender: m.gender,
              time_unknown: m.timeMode === 'unknown',
              time_mode: m.timeMode,
              role: i === 0 ? 'self' : 'other',
              birth_city: m.birthCity || undefined,
              city_lat: m.cityLat || undefined,
              city_lng: m.cityLng || undefined,
            })),
            relation_description: rRelationDesc,
          }
        }

        if (planCode === 'E1') {
          birthData.event_start_date = e1StartDate
          birthData.event_end_date = e1EndDate
        }

        if (planCode === 'E1' || planCode === 'E2') {
          birthData.available_time_slots = TIME_BLOCKS
            .filter((_, i) => eSelectedBlocks[i])
            .map(b => ({ start: b.start, end: b.end }))
        }

        if (customerNote.trim()) birthData.customer_note = customerNote.trim()
      }

      const userLocale = (typeof window !== 'undefined' && localStorage.getItem('locale')) || 'zh-TW'

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode,
          totalPrice: ['G15', 'G3', 'R'].includes(planCode) ? finalPrice : undefined,
          birthData,
          locale: userLocale,
          couponCode: couponApplied?.code || undefined,
          couponDiscount: couponApplied?.discountAmount || undefined,
          userEmail: authEmail || sessionStorage.getItem('jianyuan_email') || undefined,
        }),
      })
      const data = await res.json()
      if (data.url && data.url.startsWith('http')) {
        gtag.event('begin_checkout', {
          currency: 'USD',
          value: finalPrice,
          plan_code: planCode,
          plan_name: plan.name,
        })
        window.location.href = data.url
      } else {
        setError(data.error || '付款建立失敗，請稍後再試')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return {
    // 基本資訊
    planCode, plan, isFamilyPlan, isRelationPlan,
    // 表單
    form, setForm, timeMode, setTimeMode,
    cityResults, handleCitySearch, selectCity,
    loading, error,
    // 優惠碼
    couponInput, setCouponInput, couponApplied, setCouponApplied,
    couponLoading, couponError, setCouponError, applyCoupon,
    // 備注
    customerNote, setCustomerNote,
    // D 方案
    dTopic, setDTopic, dOtherDesc, setDOtherDesc,
    // R 方案
    rMembers, updateRMember, addRMember, removeRMember, rRelationDesc, setRRelationDesc,
    // G15 方案
    familyMembers, updateFamilyMember, addFamilyMember, removeFamilyMember,
    // E1 方案
    e1StartDate, setE1StartDate, e1EndDate, setE1EndDate,
    // E1/E2 時段
    eSelectedBlocks, setESelectedBlocks,
    // 金額
    extraMemberCount, extraPrice, rExtraCount, totalPrice, finalPrice,
    // Auth
    authChecked,
    // 提交
    handleCheckout,
  }
}
