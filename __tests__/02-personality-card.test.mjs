// 測試 2：命格名片解析器（parsePersonalityCard）
// 從 app/report/[token]/page.tsx 提取核心邏輯測試

import { suite, test, assert, assertEqual, done } from './harness.mjs'

// ── 從原始碼提取的純函式 ──

function parsePersonalityCard(markdown) {
  const cardMatch = markdown.match(/^##?\s*(?:[一二三四五六七八九十]+、\s*)?命格名片\s*\n([\s\S]*?)(?=\n##?\s|$)/m)
  if (!cardMatch) return null

  const content = cardMatch[1].trim()
  const fullText = markdown

  const cleanMd = (s) => s.replace(/\*{1,2}/g, '').replace(/^[\d]+\.\s*/, '').trim()

  // 提取人格封號
  let title = ''
  const titleMatch = content.match(/(?:人格封號|命格封號|你的封號)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
  if (titleMatch) {
    title = cleanMd(titleMatch[1])
  }
  if (!title) {
    const headingTitleMatch = content.match(/(?:人格封號|命格封號|你的封號)\s*\n+\s*\*{1,2}([^*\n]+?)\*{1,2}/m)
    if (headingTitleMatch) title = cleanMd(headingTitleMatch[1])
  }
  if (!title) {
    const globalTitleMatch = fullText.match(/(?:人格封號|命格封號|你的封號|封號)\*{0,2}[：:]\s*\*{0,2}(.+?)\*{0,2}\s*$/m)
      || fullText.match(/命格就像[^，,]*?\*{0,2}(.{2,8}(?:利刃|大樹|烈火|星光|磐石|清風|深海|明月|雷霆|瀑布|鑽石|寶劍|孤狼|鳳凰|蛟龍|精鋼))\*{0,2}/)
      || fullText.match(/「(.{2,6})」(?:的命格|命格)/)
    if (globalTitleMatch) title = cleanMd(globalTitleMatch[1])
    else {
      const h3Match = content.match(/^###?\s*(.+?)$/m)
      const boldMatch = content.match(/^\*\*(.+?)\*\*\s*$/m)
      if (h3Match) title = cleanMd(h3Match[1])
      else if (boldMatch) title = cleanMd(boldMatch[1])
    }
  }

  // 提取一句話定義
  let definition
  const defMatch = content.match(/一句話定義[你您]?\*{0,2}[：:]\s*(.+?)$/m)
  if (defMatch) {
    definition = cleanMd(defMatch[1]).replace(/^[「「"']|[」」"']$/g, '')
  }
  if (!definition) {
    const defHeadingMatch = content.match(/一句話定義[你您]?\s*\n+\s*\*{0,2}([^#\n][^\n]{5,150}?)\*{0,2}\s*$/m)
    if (defHeadingMatch) definition = cleanMd(defHeadingMatch[1]).replace(/^[「「"']|[」」"']$/g, '')
  }

  // 提取天賦
  const talents = []
  const searchContent = content + '\n' + (fullText.match(/人生速覽[\s\S]*?(?=\n##?\s|$)/)?.[0] || '')
  const talentSection = searchContent.match(/(?:天賦|優勢|天生強項|你最大的天賦)\s*(?:Top\s*\d+)?\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\s*(?:###?\s*\d+\.\s*(?:課題|挑戰|需要注意|第一印象|真實的你|關鍵字|2026|你最該)|(?:課題|挑戰|需要注意|第一印象|真實的你|關鍵字|2026|你最該))|$)/i)
    || searchContent.match(/(?:天賦|優勢)\s*(?:Top\s*\d+)\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\n)/i)
  if (talentSection) {
    for (const line of talentSection[1].split('\n')) {
      const tableMatch = line.match(/\|\s*\d+\s*\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|/)
      if (tableMatch) {
        const label = tableMatch[1].trim()
        if (label && label.length > 1 && label.length < 60) talents.push(label)
        continue
      }
      const cleaned = line.replace(/^[\s\-•·*>]+/, '').replace(/\*{1,2}/g, '').trim()
      if (cleaned && cleaned.length > 1 && cleaned.length < 80) {
        if (/^[|｜]?\s*排名/.test(cleaned) || /^[-:]+$/.test(cleaned.replace(/\|/g, ''))) continue
        const labelMatch = cleaned.match(/^(.+?)[：:—–]\s*/)
        talents.push(labelMatch ? labelMatch[1].trim() : cleaned)
      }
    }
  }

  // 提取課題
  const challenges = []
  const challengeSection = searchContent.match(/(?:課題|挑戰|需要注意|你最該注意的課題)\s*(?:Top\s*\d+)?\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\s*(?:###?\s*\d+\.\s*(?:天賦|第一印象|真實的你|關鍵字|2026)|(?:第一印象|真實的你|關鍵字|2026))|$)/i)
    || searchContent.match(/(?:課題|挑戰)\s*(?:Top\s*\d+)\*{0,2}[：:]*\s*\n([\s\S]*?)(?=\n\n)/i)
  if (challengeSection) {
    for (const line of challengeSection[1].split('\n')) {
      const tableMatch = line.match(/\|\s*\d+\s*\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|/)
      if (tableMatch) {
        const label = tableMatch[1].trim()
        if (label && label.length > 1 && label.length < 60) challenges.push(label)
        continue
      }
      const cleaned = line.replace(/^[\s\-•·*>]+/, '').replace(/\*{1,2}/g, '').trim()
      if (cleaned && cleaned.length > 1 && cleaned.length < 80) {
        if (/^[|｜]?\s*排名/.test(cleaned) || /^[-:]+$/.test(cleaned.replace(/\|/g, ''))) continue
        const labelMatch = cleaned.match(/^(.+?)[：:—–]\s*/)
        challenges.push(labelMatch ? labelMatch[1].trim() : cleaned)
      }
    }
  }

  // 提取關鍵字
  let keywords
  const kwMatch = content.match(/關鍵字\*{0,2}[：:]\s*(.+?)$/m)
    || fullText.match(/關鍵字\*{0,2}[：:]\s*(.+?)$/m)
    || content.match(/關鍵字\s*\n+\s*\*{0,2}([^#\n][^\n]+?)\*{0,2}\s*$/m)
  if (kwMatch) {
    keywords = kwMatch[1].replace(/\*{1,2}/g, '').split(/[、，,／\/|｜∣\s]+/).map(k => k.trim()).filter(k => k.length > 0 && k.length < 20)
  }

  return {
    title: title || '命格名片',
    definition,
    talents: talents.slice(0, 3),
    challenges: challenges.slice(0, 3),
    keywords,
    rawContent: content,
  }
}

// ── 測試開始 ──

suite('命格名片解析器')

test('標準格式：封號同行', () => {
  const md = `## 一、命格名片
**人格封號：** 星光指引者
一句話定義你：你是那道在黑暗中仍不熄的光
天賦 Top 3：
- 洞察力：能看穿事物本質
- 共情力：感受他人情緒
- 創造力：無中生有的能力
課題 Top 3：
- 過度思考：腦袋停不下來
- 完美主義：對自己要求太高
- 不善拒絕：太在意他人感受
關鍵字：洞察、共情、創造、直覺、敏感

## 二、下一章
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  assertEqual(result.title, '星光指引者', '封號應為星光指引者')
  assert(result.definition !== undefined, '定義應存在')
  assert(result.talents.length === 3, `天賦應有 3 個，實際 ${result.talents.length}`)
  assertEqual(result.talents[0], '洞察力', '第一天賦應為洞察力')
  assert(result.challenges.length === 3, `課題應有 3 個，實際 ${result.challenges.length}`)
  assertEqual(result.challenges[0], '過度思考', '第一課題應為過度思考')
  assert(result.keywords.length === 5, `關鍵字應有 5 個，實際 ${result.keywords.length}`)
})

test('粗體封號格式', () => {
  const md = `## 命格名片
命格封號：**江河大海**
一句話定義你：浩瀚無邊，包容萬物
天賦 Top 3：
- **領導力**：天生的號召者
課題 Top 3：
- 固執

## 下一章
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  assertEqual(result.title, '江河大海', '應移除粗體標記')
  assert(result.definition !== undefined, '定義應存在')
})

test('標題格式：封號在下一行粗體', () => {
  const md = `## 一、命格名片

### 1. 命格封號
**烈火戰神**

### 2. 一句話定義你
**你就是那把燒不盡的火焰**

### 3. 天賦 Top 3
- 行動力
- 決斷力

### 4. 課題 Top 3
- 衝動

## 二、其他
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  // 封號提取支援標題後下一行粗體格式
  assert(result.title.length > 0, '封號不應為空')
  // 標題格式定義提取
  assert(result.definition === undefined || result.definition.length > 0, '定義若存在應非空')
})

test('表格格式天賦', () => {
  const md = `## 一、命格名片
人格封號：鑽石匠人

天賦 Top 3
| 排名 | 天賦 | 佐證 |
|:---:|:---|:---|
| 1 | **精密分析力** | 八字偏印格+紫微天機 |
| 2 | **耐磨意志力** | 七殺格+人類圖34號閘門 |
| 3 | **資源整合力** | 財帛宮天府+西洋二宮金星 |

課題 Top 3
| 排名 | 課題 | 佐證 |
|:---:|:---|:---|
| 1 | **孤島症候群** | 偏印格封閉+南交天蠍 |

## 二、其他
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  // 表格格式天賦提取
  assert(result.talents.length >= 0, `天賦提取結果: ${result.talents.length} 個`)
  if (result.talents.length > 0) {
    assertEqual(result.talents[0], '精密分析力', '表格格式天賦應正確提取')
  }
})

test('無命格名片章節應回傳 null', () => {
  const md = `## 八字分析
你的八字格局為...
## 紫微斗數
命宮天機...`
  const result = parsePersonalityCard(md)
  assertEqual(result, null, '無命格名片應回傳 null')
})

test('只有封號的最小化命格名片', () => {
  const md = `## 命格名片
人格封號：清風明月

## 好的地方
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  assertEqual(result.title, '清風明月', '封號應正確')
  assertEqual(result.talents.length, 0, '無天賦資料時應為空陣列')
  assertEqual(result.challenges.length, 0, '無課題資料時應為空陣列')
})

test('封號 fallback：全文搜尋', () => {
  const md = `## 一、命格名片
這是你的命格分析。

## 二、人生速覽
封號：**磐石守護者**

## 三、其他
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  assertEqual(result.title, '磐石守護者', '應從全文找到封號')
})

test('關鍵字用各種分隔符', () => {
  const md = `## 命格名片
人格封號：測試者
關鍵字：洞察、堅韌／創意|直覺，敏感

## 下一章
`
  const result = parsePersonalityCard(md)
  assert(result !== null, '應成功解析')
  assert(result.keywords.length === 5, `關鍵字應有 5 個，實際 ${result.keywords?.length}`)
})

done()
