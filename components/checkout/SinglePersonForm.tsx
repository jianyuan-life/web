'use client'

import { type City, type LocationSearchResult, type Country } from '@/lib/cities'
import HistoricalFigures from '@/components/HistoricalFigures'
import BirthDataFields from './BirthDataFields'
import TimeBlockPicker from './TimeBlockPicker'
import CustomerNote from './CustomerNote'
import { D_TOPICS, type CheckoutFormState as FormState } from './types'

interface SinglePersonFormProps {
  planCode: string
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  timeMode: 'unknown' | 'shichen' | 'exact'
  setTimeMode: (m: 'unknown' | 'shichen' | 'exact') => void
  cityResults: LocationSearchResult[]
  onCitySearch: (val: string) => void
  onCitySelect: (c: City) => void
  onCountrySelect?: (country: Country, isMultiTz: boolean) => void
  onCancelCountry?: () => void
  needCityForCountry?: string
  // D 方案
  dTopic: string
  setDTopic: (v: string) => void
  dOtherDesc: string
  setDOtherDesc: (v: string) => void
  // E1 方案
  e1StartDate: string
  setE1StartDate: (v: string) => void
  e1EndDate: string
  setE1EndDate: (v: string) => void
  // E1/E2 時段
  eSelectedBlocks: boolean[]
  setESelectedBlocks: (v: boolean[]) => void
  // 備注
  customerNote: string
  setCustomerNote: (v: string) => void
  // 通用
  loading: boolean
  error: string
  finalPrice: number
  onSubmit: (e: React.FormEvent) => void
}

export default function SinglePersonForm({
  planCode, form, setForm, timeMode, setTimeMode,
  cityResults, onCitySearch, onCitySelect,
  onCountrySelect, onCancelCountry, needCityForCountry,
  dTopic, setDTopic, dOtherDesc, setDOtherDesc,
  e1StartDate, setE1StartDate, e1EndDate, setE1EndDate,
  eSelectedBlocks, setESelectedBlocks,
  customerNote, setCustomerNote,
  loading, error, finalPrice, onSubmit,
}: SinglePersonFormProps) {
  return (
    <form onSubmit={onSubmit} className="glass rounded-2xl p-6 space-y-4">
      {/* 一鍵導入歷史人物 */}
      <HistoricalFigures onSelect={(fig) => {
        setForm(f => ({ ...f, name: fig.name, year: fig.year, month: fig.month, day: fig.day, hour: fig.hour, minute: fig.minute, gender: fig.gender as 'M' | 'F' }))
        setTimeMode('shichen')
      }} />

      {/* 出生資料欄位 */}
      <BirthDataFields
        form={form} setForm={setForm}
        timeMode={timeMode} setTimeMode={setTimeMode}
        cityResults={cityResults}
        onCitySearch={onCitySearch}
        onCitySelect={onCitySelect}
        onCountrySelect={onCountrySelect}
        onCancelCountry={onCancelCountry}
        needCityForCountry={needCityForCountry}
      />

      {/* 方案 D：分析主題 */}
      {planCode === 'D' && (
        <div className="border-t border-gold/10 pt-4 space-y-3">
          <p className="text-sm font-semibold text-gold">專項分析設定</p>
          <div>
            <label className="block text-xs text-text-muted mb-1">分析主題 *</label>
            <select
              required
              value={dTopic}
              onChange={(e) => setDTopic(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
            >
              {D_TOPICS.map((t) => <option key={t} value={t} className="bg-[#1a1a2e] text-white">{t}</option>)}
            </select>
          </div>
          {dTopic === '問事（其他）' && (
            <div>
              <label className="block text-xs text-text-muted mb-1">請描述您的問題 *（最多 200 字）</label>
              <textarea
                required
                maxLength={200}
                rows={3}
                placeholder="請詳細說明您想了解的問題..."
                value={dOtherDesc}
                onChange={(e) => setDOtherDesc(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none"
              />
              <p className="text-[10px] text-text-muted/50 text-right mt-1">{dOtherDesc.length}/200</p>
            </div>
          )}
        </div>
      )}

      {/* 方案 E1：事件日期範圍 */}
      {planCode === 'E1' && (
        <div className="border-t border-gold/10 pt-4 space-y-3">
          <p className="text-sm font-semibold text-gold">事件日期</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">事件開始日期 *</label>
              <input
                type="date" required
                value={e1StartDate}
                onChange={(e) => setE1StartDate(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">事件結束日期 *</label>
              <input
                type="date" required
                value={e1EndDate}
                min={e1StartDate}
                onChange={(e) => setE1EndDate(e.target.value)}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>
          <p className="text-[10px] text-text-muted/60">請填寫事件的起迄日期，系統將為您找出最佳時機。</p>
          <div className="mt-3">
            <label className="block text-xs text-text-muted mb-1">事件描述 *（最多 200 字）</label>
            <textarea
              required
              maxLength={200}
              rows={3}
              placeholder="請描述事件背景（如：重要面試、簽約、旅行、搬家）與希望達成的目標..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none placeholder:text-text-muted/40"
            />
            <p className="text-[10px] text-text-muted/50 text-right mt-1">{customerNote.length}/200</p>
          </div>
        </div>
      )}

      {/* E1/E2 可配合出行時段 */}
      {(planCode === 'E1' || planCode === 'E2') && (
        <TimeBlockPicker eSelectedBlocks={eSelectedBlocks} setESelectedBlocks={setESelectedBlocks} />
      )}

      {/* 備注欄 */}
      {!['C', 'D', 'E1', 'E2'].includes(planCode) && (
        <CustomerNote customerNote={customerNote} setCustomerNote={setCustomerNote} />
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* 下一步說明 */}
      <div className="border-t border-gold/10 pt-4 mt-4">
        <p className="text-xs text-text-muted mb-2 font-semibold">付款後會發生什麼？</p>
        <div className="space-y-1.5 text-[11px] text-text-muted/70">
          <p>1. 跳轉至 Stripe 安全付款頁面完成付款</p>
          <p>2. 系統自動開始為您排盤運算與深度分析</p>
          <p>3. 完整報告平均需 30 分鐘以上{['E1', 'E2'].includes(planCode) ? '，出門訣需 40 分鐘以上' : ''}</p>
          <p>4. 完成後寄送 Email 通知，也可在儀表板即時查看</p>
        </div>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 bg-gold text-dark font-bold rounded-xl text-lg btn-glow disabled:opacity-50 mt-4"
      >
        {loading ? '跳轉付款中...' : `確認付款`}
      </button>

      <p className="text-xs text-text-muted/60 text-center">
        付款由 Stripe 安全處理，您的信用卡資訊不會經過鑒源伺服器
      </p>
    </form>
  )
}
