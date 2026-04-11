// 測試 4：截斷防護（trimToLastCompleteSentence）
// 從 workflows/generate-report/steps.ts 提取核心邏輯

import { suite, test, assert, assertEqual, done } from './harness.mjs'

// ── 從 steps.ts 提取的純函式（移除 console.log） ──

function trimToLastCompleteSentence(text) {
  const trimmed = text.trimEnd()
  if (!trimmed) return trimmed
  const lastChar = trimmed[trimmed.length - 1]
  // 已經是完整句子
  if (/[。！？」\n]/.test(lastChar)) return trimmed
  // 找最後一個句末標點的位置
  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf('。'),
    trimmed.lastIndexOf('！'),
    trimmed.lastIndexOf('？'),
    trimmed.lastIndexOf('」'),
  )
  if (lastSentenceEnd > trimmed.length * 0.8) {
    // 只有在最後 20% 的範圍內找到句末標點才裁剪
    return trimmed.slice(0, lastSentenceEnd + 1)
  }
  // 找不到合適的句末標點，加個省略句號
  return trimmed + '。'
}

// ── 測試開始 ──

suite('截斷防護')

test('空字串應回傳空字串', () => {
  assertEqual(trimToLastCompleteSentence(''), '', '空字串不變')
})

test('只有空白的字串應回傳空字串', () => {
  assertEqual(trimToLastCompleteSentence('   \n  '), '', '全空白應回傳空')
})

test('以句號結尾不裁剪', () => {
  const text = '這是一段完整的句子。'
  assertEqual(trimToLastCompleteSentence(text), text, '句號結尾不應修改')
})

test('以驚嘆號結尾不裁剪', () => {
  const text = '太準了！'
  assertEqual(trimToLastCompleteSentence(text), text, '驚嘆號結尾不應修改')
})

test('以問號結尾不裁剪', () => {
  const text = '你準備好了嗎？'
  assertEqual(trimToLastCompleteSentence(text), text, '問號結尾不應修改')
})

test('以右引號結尾不裁剪', () => {
  const text = '他說：「你很棒」'
  assertEqual(trimToLastCompleteSentence(text), text, '右引號結尾不應修改')
})

test('以換行結尾：trim 後末尾非標點則加句號', () => {
  const text = '一段文字\n'
  const result = trimToLastCompleteSentence(text)
  // trim 後末尾是「字」，不是句末標點，所以會觸發裁剪或加句號邏輯
  assert(result.endsWith('。') || result.endsWith('字'), `結果應合理，實際: "${result}"`)
})

test('截斷在最後 20% 找到句號——應裁剪', () => {
  // 構造一段文字：90% 的位置有句號，之後有殘餘文字
  const prefix = '一'.repeat(90) + '。'  // 91 字元
  const suffix = '二二二二二二二二二'     // 9 字元（在最後 10%）
  const text = prefix + suffix            // 100 字元
  const result = trimToLastCompleteSentence(text)
  assertEqual(result, prefix, '應裁剪到最後一個句號')
})

test('截斷但句號在前 80% 之前——不裁剪，加句號', () => {
  // 句號出現在文字的前 30%，之後全是沒標點的內容
  const firstPart = '開頭。'  // 3 字元（位置 2 有句號）
  const rest = '一'.repeat(97) // 97 字元
  const text = firstPart + rest // 100 字元，句號在位置 2（2% 處）
  const result = trimToLastCompleteSentence(text)
  assertEqual(result, text + '。', '句號太前面，應在末尾加句號')
})

test('完全沒有句末標點——加句號', () => {
  const text = '這段文字完全沒有句末標點只有逗號和頓號、'
  const result = trimToLastCompleteSentence(text)
  assertEqual(result, text + '。', '無句末標點應加句號')
})

test('末尾有空白應先 trim', () => {
  const text = '完整句子。   '
  assertEqual(trimToLastCompleteSentence(text), '完整句子。', '應先 trim 再判斷')
})

test('多個句末標點——裁到最後一個或加句號', () => {
  // 構造：最後的句號在 90% 位置之後，殘餘文字在最後
  const main = '一'.repeat(80) + '。天賦很強。注意健康。'  // ~85 chars, 最後句號在高位
  const broken = '殘餘'  // 2 chars
  const text = main + broken
  const result = trimToLastCompleteSentence(text)
  // 應裁到最後的「。」或加「。」
  assert(result.endsWith('。') || result.endsWith('！') || result.endsWith('？'),
    `應以句末標點結尾，實際: "${result.slice(-5)}"`)
})

test('真實場景：AI 回應被截斷', () => {
  const text = '## 改善建議\n\n1. **早起練習冥想**：每天早上六點起床，花十五分鐘靜坐冥想。這能幫助你穩定情緒，提升專注力。\n\n2. **每週運動三次**：你的命盤顯示需要加強體能。建議選擇游泳或跑步，每次至少三十分鐘。\n\n3. **學習說不**：你的課題之一是界限感不'
  const result = trimToLastCompleteSentence(text)
  assert(result.endsWith('。') || result.endsWith('！') || result.endsWith('？') || result.endsWith('」'),
    `應以完整標點結尾，實際結尾: "${result.slice(-5)}"`)
})

done()
