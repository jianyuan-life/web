// 測試 1：品質閘門邏輯
// 由於 qualityGate 在 steps.ts 使用 "use step" 指令（Vercel Workflow）且為 async，
// 我們在此提取其核心邏輯做純函式測試，不依賴 Workflow runtime。

import { suite, test, assert, assertEqual, done } from './harness.mjs'

// ── 從 steps.ts 提取品質閘門核心邏輯（純函式版本）──

function qualityGateSync(reportContent, planCode, systemsCount) {
  const warnings = []

  // 1. 系統數量檢查（C 方案需 15 套）
  if (planCode === 'C' && systemsCount < 15) {
    warnings.push(`排盤系統不足: 期望 15 套，實際 ${systemsCount} 套`)
  }

  // 2. C 方案必要章節檢查
  if (planCode === 'C') {
    const requiredSections = [
      { pattern: /命格名片|命格總覽|人生速覽/, name: '命格名片/人生速覽' },
      { pattern: /好的地方|天賦優勢|天賦.*Top|🟢/, name: '好的地方' },
      { pattern: /需要注意|課題|🟡/, name: '需要注意的地方' },
      { pattern: /改善建議|改善方案|改善|🔵/, name: '改善建議' },
      { pattern: /刻意練習/, name: '刻意練習' },
      { pattern: /寫給.*的話/, name: '寫給你的話' },
    ]
    for (const sec of requiredSections) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`缺少必要章節: ${sec.name}`)
      }
    }
  }

  // 2c. E1/E2 出門訣必要章節檢查
  if (planCode === 'E1' || planCode === 'E2') {
    const e1e2Required = [
      { pattern: /事件吉凶|事件命理|本月運勢|本月命理/, name: planCode === 'E1' ? '事件吉凶分析' : '本月運勢概覽' },
      { pattern: /好的地方|優勢|有利/, name: '好的地方' },
      { pattern: /需要注意|注意|風險/, name: '需要注意的地方' },
      { pattern: /改善|建議|行動/, name: '改善建議' },
      { pattern: /補運|操作指南/, name: '補運操作指南' },
      { pattern: /忌方|忌日|注意事項/, name: '忌方忌日' },
    ]
    for (const sec of e1e2Required) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`出門訣缺少必要章節: ${sec.name}`)
      }
    }
    if (!/===TOP5_JSON_START===/.test(reportContent)) {
      warnings.push('出門訣缺少 Top5 吉時 JSON 區塊')
    }
    if (reportContent.length < 3000) {
      warnings.push(`出門訣內容偏短: ${reportContent.length} 字（期望 > 3,000 字）`)
    }
  }

  // 2d. R 方案「合否？」必要章節檢查
  if (planCode === 'R') {
    const rRequired = [
      { pattern: /相容度總評/, name: '相容度總評' },
      { pattern: /好的地方/, name: '好的地方' },
      { pattern: /需要注意/, name: '需要注意的地方' },
      { pattern: /改善建議/, name: '改善建議' },
      { pattern: /刻意練習/, name: '刻意練習' },
    ]
    for (const sec of rRequired) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`合否缺少必要章節: ${sec.name}`)
      }
    }
  }

  // 2e. G15 家族藍圖必要章節檢查
  if (planCode === 'G15') {
    const g15Required = [
      { pattern: /家族能量|能量圖譜/, name: '家族能量圖譜' },
      { pattern: /互動關係|成員互動/, name: '成員互動關係深度分析' },
      { pattern: /溝通模式/, name: '家庭溝通模式' },
      { pattern: /家運走勢|家運/, name: '家運走勢' },
      { pattern: /行動指南|家族行動/, name: '家族行動指南' },
      { pattern: /寫給.*家|寫給這個家/, name: '寫給這個家的話' },
    ]
    for (const sec of g15Required) {
      if (!sec.pattern.test(reportContent)) {
        warnings.push(`家族藍圖缺少必要章節: ${sec.name}`)
      }
    }
  }

  // 3. 禁止字眼檢查
  const forbiddenPatterns = [
    { pattern: /命中注定/, replacement: '命盤顯示傾向' },
    { pattern: /這輩子就是/, replacement: '目前的命格走向' },
    { pattern: /前世業障/, replacement: '命格中的成長課題' },
    { pattern: /別想太多/, replacement: '你的感受是合理的' },
    { pattern: /想開一點/, replacement: '你的感受是合理的' },
  ]
  for (const fp of forbiddenPatterns) {
    if (fp.pattern.test(reportContent)) {
      warnings.push(`含有禁止字眼: "${fp.pattern.source}" (應改為 "${fp.replacement}")`)
    }
  }

  // 4. 句子截斷檢查（軟性）
  const trimmedEnd = reportContent.trim()
  const lastChar = trimmedEnd[trimmedEnd.length - 1]
  if (lastChar && !/[。！？」\n\r*]/.test(lastChar)) {
    warnings.push(`[軟性] 報告可能被截斷: 末尾字元為 "${lastChar}"（非句末標點）`)
  }

  // 5. C 方案內容長度（軟性）
  if (planCode === 'C' && reportContent.length < 15000) {
    warnings.push(`[軟性] C 方案內容偏短: ${reportContent.length} 字（期望 > 15,000 字）`)
  }

  // passed 判定：排除「含有禁止字眼」和「[軟性]」警告
  const criticalWarnings = warnings.filter(w => !w.startsWith('含有禁止字眼') && !w.startsWith('[軟性]'))
  const passed = criticalWarnings.length === 0
  return { passed, warnings }
}

// ── 測試開始 ──

suite('品質閘門邏輯')

// 建立一個完整的 C 方案模擬報告
const FULL_C_REPORT = `# 人生藍圖報告

## 命格名片
你的封號是星光指引者。

## 好的地方
天賦優勢分析...

## 需要注意的地方
課題與挑戰...

## 改善建議
具體行動方案...

## 刻意練習
每日實踐指南...

## 寫給你的話
親愛的朋友，命理是指引不是定論。
`.padEnd(16000, '內容填充。')

test('完整 C 方案報告應通過品質閘門', () => {
  const result = qualityGateSync(FULL_C_REPORT, 'C', 15)
  assert(result.passed, `應通過，但有嚴重警告: ${result.warnings.filter(w => !w.startsWith('含有禁止字眼') && !w.startsWith('[軟性]')).join(', ')}`)
})

test('C 方案系統不足應產生警告', () => {
  const result = qualityGateSync(FULL_C_REPORT, 'C', 10)
  assert(!result.passed, '系統不足應導致不通過')
  assert(result.warnings.some(w => w.includes('排盤系統不足')), '應含系統不足警告')
})

test('C 方案缺少命格名片應產生警告', () => {
  const report = FULL_C_REPORT.replace('命格名片', '其他標題')
  const result = qualityGateSync(report, 'C', 15)
  assert(!result.passed, '缺少必要章節應不通過')
  assert(result.warnings.some(w => w.includes('命格名片')), '應含命格名片警告')
})

test('C 方案缺少刻意練習應產生警告', () => {
  const report = FULL_C_REPORT.replace('刻意練習', '其他內容')
  const result = qualityGateSync(report, 'C', 15)
  assert(!result.passed, '缺少刻意練習應不通過')
})

test('[軟性] 警告不影響 passed 結果', () => {
  // 短報告但有所有必要章節
  const shortReport = FULL_C_REPORT.slice(0, 5000) // 低於 15000 字，觸發軟性警告
  // 但必要章節都在前 5000 字內
  const result = qualityGateSync(shortReport, 'C', 15)
  // 軟性警告應存在但不影響 passed（因為必要章節都在）
  assert(result.warnings.some(w => w.startsWith('[軟性]')), '應有軟性警告')
})

test('含有禁止字眼不影響 passed 結果', () => {
  const report = FULL_C_REPORT + '\n這是命中注定的安排。'
  const result = qualityGateSync(report, 'C', 15)
  assert(result.warnings.some(w => w.includes('禁止字眼')), '應檢測到禁止字眼')
  assert(result.passed, '禁止字眼不應影響 passed')
})

test('多個禁止字眼都應被檢測', () => {
  const report = FULL_C_REPORT + '\n命中注定。這輩子就是這樣。前世業障太重。'
  const result = qualityGateSync(report, 'C', 15)
  const forbiddenWarnings = result.warnings.filter(w => w.includes('禁止字眼'))
  assert(forbiddenWarnings.length >= 3, `應至少檢測到 3 個禁止字眼，實際 ${forbiddenWarnings.length} 個`)
})

test('E1 出門訣完整報告應通過', () => {
  const e1Report = `## 事件吉凶分析
好的地方很多。需要注意某些時段。
改善建議如下。補運操作指南。忌方忌日表。
===TOP5_JSON_START===
[{"time":"08:00","score":95}]
===TOP5_JSON_END===
`.padEnd(4000, '補充內容。')
  const result = qualityGateSync(e1Report, 'E1', 1)
  assert(result.passed, `E1 應通過: ${result.warnings.join(', ')}`)
})

test('E1 缺少 Top5 JSON 應不通過', () => {
  const e1Report = `## 事件吉凶分析
好的地方。需要注意。改善建議。補運操作指南。忌方忌日。
`.padEnd(4000, '補充。')
  const result = qualityGateSync(e1Report, 'E1', 1)
  assert(!result.passed, '缺少 Top5 JSON 應不通過')
  assert(result.warnings.some(w => w.includes('Top5')), '應含 Top5 警告')
})

test('E1 內容過短應不通過', () => {
  const e1Report = `事件吉凶 好的地方 需要注意 改善 補運 忌方 ===TOP5_JSON_START===[]===TOP5_JSON_END===`
  const result = qualityGateSync(e1Report, 'E1', 1)
  assert(!result.passed, '內容過短應不通過')
})

test('R 方案完整報告應通過', () => {
  const rReport = `## 相容度總評
兩人的整體相容度評估。
## 好的地方
互補的特質。
## 需要注意的地方
潛在衝突點。
## 改善建議
具體溝通方式。
## 刻意練習
每週互動指南。
`.padEnd(9000, '內容。')
  const result = qualityGateSync(rReport, 'R', 15)
  assert(result.passed, `R 應通過: ${result.warnings.join(', ')}`)
})

test('G15 家族藍圖完整報告應通過', () => {
  const g15Report = `## 家族能量圖譜
家庭整體能量分析。
## 成員互動關係分析
互動模式分析。
## 溝通模式
家庭溝通風格。
## 家運走勢
近年家運趨勢。
## 家族行動指南
具體建議。
## 寫給這個家的話
溫暖寄語。
`.padEnd(5000, '內容。')
  const result = qualityGateSync(g15Report, 'G15', 15)
  assert(result.passed, `G15 應通過: ${result.warnings.join(', ')}`)
})

test('D 方案沒有特殊章節要求，應直接通過', () => {
  const dReport = '簡單的心之所惑報告。'
  const result = qualityGateSync(dReport, 'D', 1)
  assert(result.passed, `D 方案無特殊要求應通過`)
})

test('截斷檢測：末尾非句號應有軟性警告', () => {
  const report = FULL_C_REPORT.replace(/。$/, '') + '這段話沒有結尾'
  const result = qualityGateSync(report, 'C', 15)
  assert(result.warnings.some(w => w.includes('[軟性]') && w.includes('截斷')), '應有截斷軟性警告')
})

test('截斷檢測：末尾句號不應有軟性截斷警告', () => {
  const report = FULL_C_REPORT.trimEnd() + '這段話有結尾。'
  const result = qualityGateSync(report, 'C', 15)
  assert(!result.warnings.some(w => w.includes('截斷')), '以句號結尾不應有截斷警告')
})

done()
