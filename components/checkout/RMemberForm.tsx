'use client'

import BirthTimeField from './BirthTimeField'
import CustomerNote from './CustomerNote'
import FamilyMemberPicker from './FamilyMemberPicker'
import { type FamilyMember } from './types'
import type { SavedFamilyMember } from '@/components/FamilyMembersManager'

interface RMemberFormProps {
  rMembers: FamilyMember[]
  updateRMember: (index: number, updated: FamilyMember) => void
  addRMember: () => void
  removeRMember: (index: number) => void
  rRelationDesc: string
  setRRelationDesc: (v: string) => void
  customerNote: string
  setCustomerNote: (v: string) => void
  loading: boolean
  error: string
  finalPrice: number
  isFormValid: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function RMemberForm({
  rMembers, updateRMember, addRMember, removeRMember,
  rRelationDesc, setRRelationDesc,
  customerNote, setCustomerNote,
  loading, error, finalPrice, isFormValid, onSubmit,
}: RMemberFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-4">
        {rMembers.map((member, index) => {
          const label = index === 0 ? '我' : index === 1 ? '對方' : `第 ${index + 1} 位當事人`
          return (
            <div key={index} className="border border-gold/20 rounded-xl p-4 space-y-3 bg-white/3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gold">{label}</span>
                {index >= 2 && (
                  <button type="button" onClick={() => removeRMember(index)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded px-2 py-0.5">
                    移除
                  </button>
                )}
              </div>
              {/* 從家人選擇 */}
              <FamilyMemberPicker onSelect={(saved: SavedFamilyMember) => {
                const hourVal = saved.time_mode === 'exact' ? String(saved.hour) : String(Math.floor(saved.hour / 2) * 2)
                updateRMember(index, {
                  ...member,
                  name: saved.name,
                  gender: saved.gender,
                  year: String(saved.year),
                  month: String(saved.month),
                  day: String(saved.day),
                  hour: hourVal,
                  minute: saved.time_mode === 'exact' ? String(saved.minute) : '0',
                  timeMode: saved.time_mode as 'unknown' | 'shichen' | 'exact',
                  birthCity: saved.birth_city || '',
                  cityLat: saved.city_lat || 0,
                  cityLng: saved.city_lng || 0,
                })
              }} />
              <div>
                <label className="block text-xs text-text-muted mb-1">姓名 *</label>
                <input type="text" required placeholder={`請輸入${label}的姓名`}
                  value={member.name}
                  onChange={(e) => updateRMember(index, { ...member, name: e.target.value })}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream focus:border-gold/40 focus:outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">出生年</label>
                  <input type="number" min="1920" max="2030"
                    value={member.year}
                    onChange={(e) => updateRMember(index, { ...member, year: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">月</label>
                  <select value={member.month} onChange={(e) => updateRMember(index, { ...member, month: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">日</label>
                  <select value={member.day} onChange={(e) => updateRMember(index, { ...member, day: e.target.value })}
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-gold focus:outline-none">
                    {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}日</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">性別 *</label>
                <div className="flex gap-6">
                  {[{ v: 'M', l: '男' }, { v: 'F', l: '女' }].map(({ v, l }) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={`r-gender-${index}`} value={v} checked={member.gender === v}
                        onChange={() => updateRMember(index, { ...member, gender: v })} className="accent-gold" />
                      <span className="text-sm text-text">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <BirthTimeField
                timeMode={member.timeMode}
                setTimeMode={(m) => updateRMember(index, { ...member, timeMode: m })}
                hour={member.hour}
                minute={member.minute}
                onChange={(field, val) => updateRMember(index, { ...member, [field]: val })}
              />
              {/* 出生地區 */}
              <div>
                <label className="block text-xs text-text-muted mb-1">出生地區 <span className="text-red-400">*</span></label>
                <input type="text" required
                  placeholder="輸入地區名（如：台灣、香港、日本）"
                  value={member.birthCity || ''}
                  onChange={(e) => updateRMember(index, { ...member, birthCity: e.target.value, cityLat: 0, cityLng: 0 })}
                  className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-cream text-sm focus:border-gold/40 focus:outline-none placeholder:text-text-muted/40"
                />
                {!member.birthCity?.trim() && (
                  <p className="text-[10px] text-red-400/70 mt-1">請輸入出生地區</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {rMembers.length < 6 && (
        <button type="button" onClick={addRMember}
          className="w-full py-3 border border-gold/30 rounded-xl text-gold text-sm hover:bg-gold/10 transition-all">
          + 加入第 {rMembers.length + 1} 位當事人
          <span className="text-text-muted ml-2">(+$19)</span>
        </button>
      )}

      {/* 關係說明 */}
      <div className="border-t border-gold/10 pt-4">
        <label className="block text-xs text-text-muted mb-1">關係說明 *（最多 200 字）</label>
        <textarea
          required
          maxLength={200}
          rows={3}
          placeholder="請描述你們的關係（如：戀人、夫妻、合作夥伴），以及想了解的問題..."
          value={rRelationDesc}
          onChange={(e) => setRRelationDesc(e.target.value)}
          className="w-full bg-white/5 border border-gold/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-gold focus:outline-none resize-none"
        />
        <p className="text-[10px] text-text-muted/50 text-right mt-1">{rRelationDesc.length}/200</p>
      </div>

      <CustomerNote customerNote={customerNote} setCustomerNote={setCustomerNote} />

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        type="submit" disabled={loading || !isFormValid}
        className={`w-full py-3.5 font-bold rounded-xl text-lg mt-4 transition-all ${
          isFormValid
            ? 'bg-gold text-dark btn-glow disabled:opacity-50'
            : 'bg-white/10 text-text-muted cursor-not-allowed'
        }`}
      >
        {loading ? '跳轉付款中...' : !isFormValid ? '請填寫完整資料' : finalPrice === 0 ? '免費領取報告' : `確認付款 — $${finalPrice}`}
      </button>
      <p className="text-xs text-text-muted/60 text-center">
        付款由 Stripe 安全處理。報告平均需 30 分鐘以上，出門訣需 40 分鐘以上。
      </p>
    </form>
  )
}
