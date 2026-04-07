'use client'

import { TIME_BLOCKS } from './types'

interface TimeBlockPickerProps {
  eSelectedBlocks: boolean[]
  setESelectedBlocks: (v: boolean[]) => void
}

export default function TimeBlockPicker({ eSelectedBlocks, setESelectedBlocks }: TimeBlockPickerProps) {
  return (
    <div className="border-t border-gold/10 pt-4 space-y-3">
      <p className="text-sm font-semibold text-gold">可配合出行的時段 *</p>
      <p className="text-xs text-text-muted leading-relaxed">
        請勾選您方便出門的時間段，系統將只在這些時段內為您找出最佳吉時。至少勾選一個時段。
      </p>
      <div className="grid grid-cols-2 gap-2">
        {TIME_BLOCKS.map((block, i) => (
          <label key={block.label} className={`flex items-center gap-2.5 cursor-pointer rounded-lg border px-3 py-2.5 transition-all ${
            eSelectedBlocks[i]
              ? 'border-gold/40 bg-gold/10'
              : 'border-gold/10 bg-white/5 hover:bg-white/8'
          }`}>
            <input
              type="checkbox"
              checked={eSelectedBlocks[i]}
              onChange={() => {
                const updated = [...eSelectedBlocks]
                updated[i] = !updated[i]
                setESelectedBlocks(updated)
              }}
              className="accent-gold shrink-0"
            />
            <span className="text-sm text-text">{block.label}</span>
          </label>
        ))}
      </div>
      {!eSelectedBlocks.some(b => b) && (
        <p className="text-[10px] text-red-400/80">請至少勾選一個時段</p>
      )}
    </div>
  )
}
