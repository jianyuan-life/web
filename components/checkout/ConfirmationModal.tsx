'use client'

import { SHICHEN } from './types'

interface ConfirmationModalProps {
  show: boolean
  onClose: () => void
  onConfirm: () => void
  planCode: string
  form: {
    name: string
    year: string
    month: string
    day: string
    hour: string
    minute: string
    gender: string
    birthCity: string
    calendarType: 'solar' | 'lunar'
  }
  timeMode: 'unknown' | 'shichen' | 'exact'
  loading: boolean
}

export default function ConfirmationModal({
  show, onClose, onConfirm, planCode, form, timeMode, loading,
}: ConfirmationModalProps) {
  if (!show) return null

  // 格式化出生時間顯示
  const getTimeDisplay = () => {
    if (timeMode === 'unknown') return '不確定'
    if (timeMode === 'shichen') {
      const shichen = SHICHEN.find(s => s.value === parseInt(form.hour))
      return shichen ? `${shichen.label}（以時辰計）` : `${form.hour}時（以時辰計）`
    }
    return `${form.hour}時${form.minute}分（知道精確時間）`
  }

  const getGenderDisplay = () => form.gender === 'M' ? '男' : '女'
  const getCalendarDisplay = () => form.calendarType === 'solar' ? '國曆' : '農曆'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 彈窗內容 */}
      <div className="relative glass rounded-2xl p-6 max-w-md w-full border border-gold/20 shadow-2xl">
        <h3 className="text-lg font-bold text-gold text-center mb-4">
          請確認您的出生資料
        </h3>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-text-muted text-sm">姓名</span>
            <span className="text-white font-medium">{form.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-text-muted text-sm">性別</span>
            <span className="text-white font-medium">{getGenderDisplay()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-text-muted text-sm">曆法</span>
            <span className="text-white font-medium">{getCalendarDisplay()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-text-muted text-sm">出生日期</span>
            <span className="text-white font-medium">{form.year}年{form.month}月{form.day}日</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-text-muted text-sm">出生時間</span>
            <span className="text-white font-medium">{getTimeDisplay()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-text-muted text-sm">出生地區</span>
            <span className="text-white font-medium">{form.birthCity}</span>
          </div>
        </div>

        {/* 警告提示 */}
        <div className="bg-gold/10 border border-gold/20 rounded-xl p-3 mb-5">
          <p className="text-xs text-gold/90 leading-relaxed text-center">
            出生資料一旦提交將用於排盤計算，請務必確認正確。
          </p>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 border border-gold/30 text-gold rounded-xl font-medium hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            返回修改
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-gold text-dark font-bold rounded-xl btn-glow disabled:opacity-50"
          >
            {loading ? '跳轉付款中...' : '確認無誤，付款'}
          </button>
        </div>
      </div>
    </div>
  )
}
