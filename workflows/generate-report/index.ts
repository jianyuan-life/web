// ============================================================
// 報告生成 Workflow — 主流程編排（"use workflow" 沙箱環境）
// 每個 step 自動持久化、自動重試、崩潰後自動恢復
// ============================================================

import {
  loadReportRecord,
  callPythonCalculate,
  aiGenerateCall1,
  aiGenerateCall2,
  aiGenerateCall3,
  aiGenerateCall4,
  aiGenerateGeneric,
  qualityGate,
  generatePDF,
  saveReportToSupabase,
  sendReportEmail,
  markReportFailed,
  closeProgressStream,
  PLAN_SYSTEM_PROMPT,
} from './steps'

export async function generateReportWorkflow(reportId: string) {
  "use workflow";

  // Step 0: 從 Supabase 載入報告記錄
  let record
  try {
    record = await loadReportRecord(reportId)
  } catch (e) {
    await markReportFailed(reportId, `載入報告記錄失敗: ${e instanceof Error ? e.message : '未知錯誤'}`)
    await closeProgressStream()
    return { success: false, error: '載入記錄失敗' }
  }

  const { birthData, planCode, accessToken, customerEmail } = record

  // Step 1: 排盤計算
  let calcResult
  try {
    calcResult = await callPythonCalculate(birthData)
  } catch (e) {
    await markReportFailed(reportId, `排盤計算失敗: ${e instanceof Error ? e.message : '未知錯誤'}`)
    await closeProgressStream()
    return { success: false, error: '排盤計算失敗' }
  }

  const analyses = calcResult.analyses || []
  const analysesSummary = analyses.map((a: { system: string; score: number }) => ({
    system: a.system, score: a.score,
  }))

  // Step 2: AI 生成報告內容
  let reportContent = ''
  let aiModelUsed = 'unknown'

  try {
    if (planCode === 'C') {
      // ── C 方案：4 個 AI call 並行生成 ──
      const [r1, r2, r3, r4] = await Promise.all([
        aiGenerateCall1(calcResult, birthData, birthData.question || birthData.topic),
        aiGenerateCall2(calcResult, birthData),
        aiGenerateCall3(calcResult, birthData),
        aiGenerateCall4(calcResult, birthData),
      ])

      // Call D 完整性檢查
      let call4Content = r4.content
      const hasDeliberatePractice = call4Content.includes('刻意練習')
      const hasClosingLetter = call4Content.includes('寫給') && (call4Content.includes('的話') || call4Content.includes('們的話'))

      if (!hasDeliberatePractice || !hasClosingLetter) {
        const missingParts: string[] = []
        if (!hasDeliberatePractice) missingParts.push('刻意練習（投資/感情/事業/健康/人際五大面向，每項至少200字）')
        if (!hasClosingLetter) missingParts.push('寫給客戶的話（至少3段，帶命理依據的回顧過去+看見現在+展望未來）')

        // 重試 Call 4
        const retryR4 = await aiGenerateCall4(calcResult, birthData, true, missingParts)
        call4Content = retryR4.content
      }

      reportContent = [r1.content, r2.content, r3.content, call4Content].join('\n\n')
      // 記錄使用的模型（以 call1 為主要參考）
      aiModelUsed = r1.model
    } else {
      // ── 其他方案：單次 AI 呼叫 ──
      const systemPrompt = PLAN_SYSTEM_PROMPT[planCode] || PLAN_SYSTEM_PROMPT['C']
      const result = await aiGenerateGeneric(
        calcResult, birthData, planCode, systemPrompt,
        birthData.topic, birthData.question,
      )
      reportContent = result.content
      aiModelUsed = result.model
    }
  } catch (e) {
    await markReportFailed(reportId, `AI 生成失敗: ${e instanceof Error ? e.message : '未知錯誤'}`)
    await closeProgressStream()
    return { success: false, error: 'AI 生成失敗' }
  }

  if (!reportContent) {
    await markReportFailed(reportId, 'AI 未回覆：AI 回傳空內容')
    await closeProgressStream()
    return { success: false, error: 'AI 未回覆' }
  }

  // Step 3: 自動品質閘門
  try {
    const qResult = await qualityGate(reportContent, planCode, analyses.length)
    if (qResult.warnings.length > 0) {
      console.warn(`品質閘門警告 (${qResult.warnings.length}):`, qResult.warnings.join('; '))
    }
    if (!qResult.passed) {
      // 品質未通過但不阻塞（記錄警告，繼續生成）
      console.error(`品質閘門未通過: ${qResult.warnings.join('; ')}`)
    }
  } catch (e) {
    // 品質閘門失敗不阻塞流程
    console.error('品質閘門執行失敗:', e)
  }

  // Step 4: 解析出門訣 Top5 吉時 JSON（E1/E2 方案，非 step function）
  let top5Timings = null
  const top5Match = reportContent.match(/===TOP5_JSON_START===\s*([\s\S]*?)\s*===TOP5_JSON_END===/)
  if (top5Match) {
    try {
      top5Timings = JSON.parse(top5Match[1])
      reportContent = reportContent.replace(/===TOP5_JSON_START===[\s\S]*?===TOP5_JSON_END===/g, '').trim()
    } catch {
      // JSON 解析失敗不阻塞
    }
  }

  // Step 5: 生成 PDF
  let pdfUrl: string | null = null
  try {
    pdfUrl = await generatePDF(reportId, planCode, birthData, reportContent, analysesSummary)
  } catch (e) {
    // PDF 失敗不阻塞整體流程
    console.error('PDF 生成失敗（不影響報告）:', e)
  }

  // Step 5: 儲存到 Supabase
  try {
    await saveReportToSupabase(reportId, reportContent, aiModelUsed, analysesSummary, pdfUrl, top5Timings)
  } catch (e) {
    await markReportFailed(reportId, `儲存報告失敗: ${e instanceof Error ? e.message : '未知錯誤'}`)
    await closeProgressStream()
    return { success: false, error: '儲存失敗' }
  }

  // Step 6: 寄送 Email
  try {
    await sendReportEmail(reportId, customerEmail, accessToken, birthData, planCode, reportContent, analyses.length)
  } catch (e) {
    // Email 失敗不影響報告完成狀態
    console.error('Email 寄送失敗（報告已完成）:', e)
  }

  // 完成
  await closeProgressStream()

  return {
    success: true,
    reportId,
    contentLength: reportContent.length,
    systemsCount: analyses.length,
    aiModel: aiModelUsed,
  }
}
