// 極簡測試工具 — 零依賴
let _passed = 0, _failed = 0, _skipped = 0, _suiteName = ''

export function suite(name) {
  _suiteName = name
  _passed = 0; _failed = 0; _skipped = 0
  console.log(`\n--- ${name} ---`)
}

export function test(name, fn) {
  try {
    fn()
    _passed++
    console.log(`  [PASS] ${name}`)
  } catch (e) {
    _failed++
    console.log(`  [FAIL] ${name}`)
    console.log(`         ${e.message}`)
  }
}

export function skip(name) {
  _skipped++
  console.log(`  [SKIP] ${name}`)
}

export function assert(condition, msg) {
  if (!condition) throw new Error(msg || '斷言失敗')
}

export function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || `期望 ${JSON.stringify(expected)}，得到 ${JSON.stringify(actual)}`)
  }
}

export function assertIncludes(arr, item, msg) {
  if (!arr.includes(item)) {
    throw new Error(msg || `陣列不包含 ${JSON.stringify(item)}`)
  }
}

export function done() {
  // 最後一行輸出 JSON 供 runner 解析
  console.log(JSON.stringify({ suite: _suiteName, passed: _passed, failed: _failed, skipped: _skipped }))
}
