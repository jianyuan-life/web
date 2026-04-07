#!/bin/bash
# ─────────────────────────────────────────────
# 鑑源命理平台 - 煙霧測試腳本
# 用法：bash scripts/smoke-test.sh [BASE_URL]
# 預設 BASE_URL：https://jianyuan.life
# 本地測試：bash scripts/smoke-test.sh http://localhost:3000
# ─────────────────────────────────────────────

BASE_URL="${1:-https://jianyuan.life}"
PASS=0
FAIL=0

echo "========================================"
echo "  鑑源煙霧測試"
echo "  目標：${BASE_URL}"
echo "========================================"
echo ""

# 測試函式：檢查 HTTP 狀態碼
test_endpoint() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local data="$4"
  local description="$5"

  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" --max-time 10)
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$data" \
      "${BASE_URL}${path}" --max-time 10)
  fi

  if [ "$status" = "$expected" ]; then
    echo "[通過] ${description} — HTTP ${status}"
    PASS=$((PASS + 1))
  else
    echo "[失敗] ${description} — 預期 ${expected}，實際 ${status}"
    FAIL=$((FAIL + 1))
  fi
}

# ── 1. 首頁 ──
test_endpoint GET "/" "200" "" "首頁載入"

# ── 2. 定價頁 ──
test_endpoint GET "/pricing" "200" "" "定價頁載入"

# ── 3. 報告 API ──
test_endpoint GET "/api/reports" "200" "" "GET /api/reports 回應正常"

# ── 4. Checkout API（缺少參數應回 400 或 500，不應 crash）──
test_endpoint POST "/api/checkout" "400" '{}' "POST /api/checkout 空資料（應回 400）"

# ── 5. Checkout API（無效方案代碼）──
test_endpoint POST "/api/checkout" "400" '{"planCode":"INVALID"}' "POST /api/checkout 無效方案（應回 400）"

# ── 6. 免費八字 API ──
test_endpoint POST "/api/free-bazi" "200" '{"year":1990,"month":1,"day":1,"hour":12}' "POST /api/free-bazi 正常請求"

# ── 7. 隱私政策頁 ──
test_endpoint GET "/privacy" "200" "" "隱私政策頁載入"

# ── 8. 服務條款頁 ──
test_endpoint GET "/terms" "200" "" "服務條款頁載入"

echo ""
echo "========================================"
echo "  結果：通過 ${PASS} / 失敗 ${FAIL}"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
