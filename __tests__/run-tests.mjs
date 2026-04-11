#!/usr/bin/env node
// 純 Node.js 測試執行器 — 不依賴任何第三方套件
// 用法：node __tests__/run-tests.mjs

import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { fork } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const testFiles = readdirSync(__dirname)
  .filter(f => f.endsWith('.test.mjs'))
  .sort()

let totalPassed = 0
let totalFailed = 0
let totalSkipped = 0

console.log(`\n${'='.repeat(60)}`)
console.log(`  鑑源自動化測試套件`)
console.log(`  發現 ${testFiles.length} 個測試檔案`)
console.log(`${'='.repeat(60)}\n`)

for (const file of testFiles) {
  const filePath = join(__dirname, file)
  const result = await new Promise((resolve) => {
    const child = fork(filePath, [], { stdio: 'pipe', env: { ...process.env, NODE_NO_WARNINGS: '1' } })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', d => { stdout += d; process.stdout.write(d) })
    child.stderr?.on('data', d => { stderr += d })
    child.on('exit', code => resolve({ code, stdout, stderr }))
    child.on('error', err => resolve({ code: 1, stdout, stderr: err.message }))
  })

  // 從 stdout 解析結果（每個測試檔最後一行會輸出 JSON 統計）
  const lines = result.stdout.trim().split('\n')
  const lastLine = lines[lines.length - 1]
  try {
    const stats = JSON.parse(lastLine)
    totalPassed += stats.passed || 0
    totalFailed += stats.failed || 0
    totalSkipped += stats.skipped || 0
  } catch {
    // 如果解析失敗，視為該檔案整體失敗
    if (result.code !== 0) totalFailed++
    if (result.stderr) console.error(`  stderr: ${result.stderr.slice(0, 200)}`)
  }
  console.log('')
}

console.log(`${'='.repeat(60)}`)
console.log(`  總結: ${totalPassed} 通過 / ${totalFailed} 失敗 / ${totalSkipped} 跳過`)
console.log(`${'='.repeat(60)}\n`)

process.exit(totalFailed > 0 ? 1 : 0)
