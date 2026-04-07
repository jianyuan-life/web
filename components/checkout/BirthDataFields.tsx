'use client'

import { type City } from '@/lib/cities'
import BirthTimeField from './BirthTimeField'
import { type CheckoutFormState as FormState } from './types'

interface BirthDataFieldsProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  timeMode: 'unknown' | 'shichen' | 'exact'
  setTimeMode: (m: 'unknown' | 'shichen' | 'exact') => void
  cityResults: City[]
  onCitySearch: (val: string) => void
  onCitySelect: (c: City) => void
}

export default function BirthDataFields({
  form, setForm, timeMode, setTimeMode,
  cityResults, onCitySearch, onCitySelect,
}: BirthDataFieldsProps) {
  return (
    <>
      {/* 姓名 */}
      <div>
        <label className="block text-xs text-text-muted mb-1">姓名 *</label>
        <input
          type="text" required placeholder="請輸入您的全名"
          value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none"
        />
      </div>

      {/* 國曆/農曆切換 */}
      <div>
        <label className="block text-xs text-text-muted mb-1">曆法</label>
        <div className="flex rounded-lg overflow-hidden border border-gold/20">
          {([{ v: 'solar' as const, l: '國曆（西曆）' }, { v: 'lunar' as const, l: '農曆' }]).map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, calendarType: v, lunarLeap: false }))}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${form.calendarType === v ? 'bg-gold/20 text-gold' : 'bg-white/5 text-text-muted hover:bg-white/5'}`}>
              {l}
            </button>
          ))}
        </div>
        {form.calendarType === 'lunar' && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={form.lunarLeap}
              onChange={(e) => setForm(f => ({ ...f, lunarLeap: e.target.checked }))}
              className="accent-gold" />
            <span className="text-xs text-text-muted">閏月</span>
          </label>
        )}
      </div>

      {/* 年月日 */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">出生年</label>
          <input
            type="number" min="1920" max="2030"
            value={form.year} onChange={(e) => setForm(f => ({ ...f, year: e.target.value }))}
            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">{form.calendarType === 'lunar' ? '農曆月' : '月'}</label>
          <select value={form.month} onChange={(e) => setForm(f => ({ ...f, month: e.target.value }))}
            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {form.calendarType === 'lunar'
                  ? ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'][i] + '月'
                  : `${i + 1}月`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">{form.calendarType === 'lunar' ? '農曆日' : '日'}</label>
          <select value={form.day} onChange={(e) => setForm(f => ({ ...f, day: e.target.value }))}
            className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
            {Array.from({ length: form.calendarType === 'lunar' ? 30 : 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {form.calendarType === 'lunar'
                  ? ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'][i]
                  : `${i + 1}日`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 出生時間 */}
      <BirthTimeField
        timeMode={timeMode}
        setTimeMode={setTimeMode}
        hour={form.hour}
        minute={form.minute}
        onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
      />

      {/* 性別 */}
      <div>
        <label className="block text-xs text-text-muted mb-1">性別</label>
        <div className="flex gap-6">
          {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="gender" value={v} checked={form.gender === v}
                onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))} className="accent-gold" />
              <span className="text-sm text-text">{l}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 出生城市 */}
      <div className="relative">
        <label className="block text-xs text-text-muted mb-1">出生城市（可選，用於真太陽時校正）</label>
        <input
          type="text"
          placeholder="輸入城市名（如：台北、香港、上海）"
          value={form.birthCity}
          onChange={(e) => onCitySearch(e.target.value)}
          className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
        />
        {cityResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-dark border border-gold/20 rounded-lg overflow-hidden shadow-xl">
            {cityResults.map((c: City) => (
              <button key={`${c.name}-${c.lat}`} type="button"
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gold/10 border-b border-gold/5 last:border-0"
                onClick={() => onCitySelect(c)}
              >{c.name}（{c.country}）</button>
            ))}
          </div>
        )}
        {form.cityLat !== 0 && (
          <p className="text-[10px] text-text-muted/50 mt-1">
            經度 {form.cityLng.toFixed(2)}° | 時區 UTC{form.cityTz >= 0 ? '+' : ''}{form.cityTz} | 將自動校正真太陽時
          </p>
        )}
      </div>
    </>
  )
}
