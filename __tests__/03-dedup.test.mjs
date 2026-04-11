// 測試 3：章節去重邏輯（cleanFinalReport）
// 從 workflows/generate-report/steps.ts 提取核心邏輯

import { suite, test, assert, assertEqual, done } from './harness.mjs'

// ── 從 steps.ts 提取的純函式 ──

function cleanFinalReport(text, clientName) {
  let cleaned = text

  // 1. 含客戶名的重複標題
  if (clientName) {
    const escapedName = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const namePattern = new RegExp(`^#{1,2}\\s*.*${escapedName}.*報告.*$`, 'gm')
    let count = 0
    cleaned = cleaned.replace(namePattern, (match) => {
      count++
      return count === 1 ? match : ''
    })
  }

  // H1 報告標題去重
  {
    const h1Pattern = /^# .+報告.*$/gm
    let h1Count = 0
    cleaned = cleaned.replace(h1Pattern, (match) => {
      h1Count++
      return h1Count === 1 ? match : ''
    })
  }

  // 客戶資料區塊去重
  {
    const infoPattern = /^\*\*客戶[：:]?\*\*.*$(\n^\*\*.+\*\*.*$)*/gm
    let infoCount = 0
    cleaned = cleaned.replace(infoPattern, (match) => {
      infoCount++
      return infoCount === 1 ? match : ''
    })
  }

  // 2. 合併重複章節
  const sections = cleaned.split(/(?=^## )/m)
  const sectionMap = new Map()
  const duplicateIndices = new Set()

  function normalizeSectionTitle(raw) {
    return raw
      .replace(/[（(][^）)]*[字词詞][）)]/g, '')
      .replace(/[（(]\s*~?\s*[\d,]+\s*[字词詞]?\s*[）)]/g, '')
      .replace(/^[\s\d.、：:一二三四五六七八九十百千]+/g, '')
      .replace(/[\s\d.、：:]+$/g, '')
      .trim()
  }

  function titlesAreSimilar(a, b) {
    if (a === b) return true
    if (!a || !b) return false
    const shorter = a.length <= b.length ? a : b
    const longer = a.length > b.length ? a : b
    if (longer.includes(shorter)) return true
    let matches = 0
    const chars = shorter.split('')
    for (const ch of chars) {
      if (longer.includes(ch)) matches++
    }
    return matches / shorter.length > 0.8
  }

  sections.forEach((sec, idx) => {
    const titleMatch = sec.match(/^## (.+?)[\n\r]/)
    if (!titleMatch) return
    const normalizedTitle = normalizeSectionTitle(titleMatch[1])
    if (!normalizedTitle) return

    let matchedKey = null
    for (const [key] of sectionMap) {
      if (titlesAreSimilar(key, normalizedTitle)) {
        matchedKey = key
        break
      }
    }

    if (matchedKey) {
      const existing = sectionMap.get(matchedKey)
      duplicateIndices.add(existing.index)
      sectionMap.set(matchedKey, { index: idx, content: sec, length: sec.length })
    } else {
      sectionMap.set(normalizedTitle, { index: idx, content: sec, length: sec.length })
    }
  })

  if (duplicateIndices.size > 0) {
    cleaned = sections.filter((_, idx) => !duplicateIndices.has(idx)).join('')
  }

  // 3. 刪除空章節
  cleaned = cleaned.replace(/^## .+\n([\s\S]*?)(?=^## |\Z)/gm, (match, body) => {
    const bodyText = body.replace(/\s/g, '')
    if (bodyText.length < 50) return ''
    return match
  })

  // 4. 連續空行收攏
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  return cleaned.trim()
}

// ── 測試開始 ──

suite('章節去重邏輯')

test('完全相同的 H1 報告標題去重（保留第一個）', () => {
  const text = `# 張三的人生藍圖報告
正文內容...
# 張三的人生藍圖報告
又是一段正文...`
  const result = cleanFinalReport(text)
  const h1Matches = result.match(/^# .+報告.*$/gm) || []
  assertEqual(h1Matches.length, 1, '應只保留一個 H1 標題')
})

test('含客戶名的重複標題去重', () => {
  const text = `# 張三的人生藍圖報告
第一段
## 張三的命格分析報告
第二段
## 張三 報告總結
第三段`
  const result = cleanFinalReport(text, '張三')
  // 只有 H1/H2 中含「張三...報告」的會去重
  const titleMatches = result.match(/^#{1,2}\s*.*張三.*報告.*$/gm) || []
  assertEqual(titleMatches.length, 1, '含客戶名的報告標題應只保留第一個')
})

test('相同章節標題去重（保留後者）', () => {
  const text = `## 感情與人際
這是第一版，比較短。

## 事業與財運
事業分析內容。這裡有足夠多的文字來確保不被當成空章節，需要超過五十個字元才行，所以我多寫一些。

## 感情與人際
這是重跑後的第二版，內容更完整更詳細，品質更好。這裡有足夠多的文字來確保不被當成空章節。`
  const result = cleanFinalReport(text)
  const sectionMatches = result.match(/^## 感情與人際$/gm) || []
  assertEqual(sectionMatches.length, 1, '重複章節應只保留一個')
  assert(result.includes('第二版'), '應保留後者（品質重跑版本）')
  assert(!result.includes('第一版'), '應移除前者')
})

test('帶字數提示的標題應識別為相同', () => {
  const norm = (raw) => raw
    .replace(/[（(][^）)]*[字词詞][）)]/g, '')
    .replace(/[（(]\s*~?\s*[\d,]+\s*[字词詞]?\s*[）)]/g, '')
    .replace(/^[\s\d.、：:一二三四五六七八九十百千]+/g, '')
    .replace(/[\s\d.、：:]+$/g, '')
    .trim()

  assertEqual(norm('五、感情與人際（~3,500字）'), '感情與人際', '應移除字數提示')
  assertEqual(norm('5. 感情與人際'), '感情與人際', '應移除數字編號')
  assertEqual(norm('五、感情與人際'), '感情與人際', '應移除中文編號')
})

test('titlesAreSimilar 基本判斷', () => {
  function titlesAreSimilar(a, b) {
    if (a === b) return true
    if (!a || !b) return false
    const shorter = a.length <= b.length ? a : b
    const longer = a.length > b.length ? a : b
    if (longer.includes(shorter)) return true
    let matches = 0
    for (const ch of shorter.split('')) {
      if (longer.includes(ch)) matches++
    }
    return matches / shorter.length > 0.8
  }

  assert(titlesAreSimilar('感情與人際', '感情與人際'), '完全相同應為 similar')
  assert(titlesAreSimilar('感情與人際', '感情與人際關係'), '包含關係應為 similar')
  assert(!titlesAreSimilar('感情與人際', '事業與財運'), '完全不同不應為 similar')
  assert(!titlesAreSimilar('', '感情'), '空字串不應相似')
})

test('空章節應被移除', () => {
  const text = `## 有內容的章節
這裡有很多很多很多內容，確保超過五十個字元的門檻。重複一些確保足夠長度，這是一段完整的分析內容。

## 空章節


## 另一個有內容的章節
這裡也有足夠多的內容讓它不被移除，超過五十個字元的門檻就可以了，我們再多加一些。`
  const result = cleanFinalReport(text)
  assert(!result.includes('空章節'), '空章節（< 50 字）應被移除')
  assert(result.includes('有內容的章節'), '有內容的章節應保留')
})

test('客戶資料區塊去重', () => {
  const text = `**客戶：** 張三
**出生日期：** 1990-01-01
正文
**客戶：** 張三
**出生日期：** 1990-01-01
更多正文`
  const result = cleanFinalReport(text)
  const infoMatches = result.match(/\*\*客戶[：:]?\*\*/g) || []
  assertEqual(infoMatches.length, 1, '客戶資料區塊應只保留一個')
})

test('連續空行應收攏', () => {
  const text = `## 章節一
內容一，足夠長的內容確保不被移除，超過五十個字元的門檻，這段分析非常重要。




## 章節二
內容二，也要足夠長確保不被移除，超過五十個字元的門檻，這段分析同樣重要。`
  const result = cleanFinalReport(text)
  assert(!result.includes('\n\n\n\n'), '不應有超過 3 個連續換行')
})

test('不同章節標題不應被合併', () => {
  // 注意：空章節判定用去除空白後的字元數 < 50，所以每段內容要足夠長
  const pad = '這是一段足夠長的分析內容，確保超過五十個不含空白的中文字元，避免被當成空章節刪除。加上更多文字以確保萬無一失。'
  const text = `## 八字分析\n${pad}\n\n## 紫微斗數\n${pad}\n\n## 西洋占星\n${pad}`
  const result = cleanFinalReport(text)
  assert(result.includes('八字分析'), '八字分析應保留')
  assert(result.includes('紫微斗數'), '紫微斗數應保留')
  assert(result.includes('西洋占星'), '西洋占星應保留')
})

done()
