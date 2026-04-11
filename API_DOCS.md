# 鑑源命理平台 API 文件

> 最後更新：2026-04-11 | 網站版本：v4.5.24

---

## 認證方式

| 方式 | 說明 | 使用場景 |
|:---|:---|:---|
| **ADMIN_KEY** | Query parameter `?key=ADMIN_KEY` | 後台管理 API |
| **CRON_SECRET** | `Authorization: Bearer <CRON_SECRET>` 或 `x-internal-secret` header | Cron 任務、內部呼叫 |
| **Supabase Auth** | `Authorization: Bearer <access_token>` 或 Supabase auth cookie | 用戶相關 API |
| **Stripe Signature** | `stripe-signature` header | Webhook |
| **無認證** | 公開 API | 免費工具、統計 |

---

## 後台管理 API（需 ADMIN_KEY）

### GET /api/admin

**後台儀表板總覽**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |
| `range` | string | 時間範圍：`7d`（預設）/ `30d` / `90d` |

**回傳**：訪客統計、營收、產品銷售排行、熱門頁面、國家分佈、設備分佈、每日營收、最近訂單。自動過濾 bot 流量。

---

### GET /api/admin/orders

**取得所有訂單**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |

**回傳**：最近 500 筆訂單（含 client_name、plan_code、amount_usd、status、birth_data 摘要）。birth_data 已移除敏感個資，只保留 name/plan/locale/year/gender。

### PATCH /api/admin/orders

**管理員強制重試報告（任何狀態皆可）**

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `id` | string | 報告 ID（必填） |
| `key` | string | ADMIN_KEY（必填） |

重置報告狀態為 pending，觸發 Workflow → Fallback 雙重生成機制。

---

### GET /api/admin/monitoring

**報告生成監控（過去 24 小時）**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |

**回傳**：
- `summary`：報告總數、各狀態數量（completed/failed/generating/pending）、成功率
- `performance`：平均生成時間
- `cost`：Claude API 花費估算
- `plan_breakdown`：按方案分類統計
- `error_categories`：錯誤分類統計（超時/Claude 過載/額度不足/限流/觸發失敗/排盤錯誤）
- `currently_generating`：當前正在生成的報告數
- `recent_reports`：最近 10 份報告詳細狀態

---

### GET /api/admin/users

**用戶管理**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |
| `sort` | string | 排序欄位：`created_at`（預設）/ `purchase_count` / `total_spent` |
| `order` | string | 排序方向：`desc`（預設）/ `asc` |

**回傳**：所有用戶清單（含註冊時間、最後登入、購買次數、總消費金額、各報告狀態）。

---

### GET /api/admin/coupons

**取得所有優惠碼**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |

### POST /api/admin/coupons

**新增優惠碼**

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `code` | string | 優惠碼（必填，自動轉大寫） |
| `discount_type` | string | `percentage` / `fixed` / `free` |
| `discount_value` | number | 折扣值（百分比或固定金額） |
| `applicable_products` | string[] | 適用方案代碼陣列（空=全部適用） |
| `max_uses` | number | 最大使用次數（null=無限） |
| `valid_until` | string | 有效期限（ISO 日期） |
| `note` | string | 備註 |

### PATCH /api/admin/coupons

**切換優惠碼狀態或刪除**

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `id` | string | 優惠碼 ID（必填） |
| `action` | string | `toggle`（切換啟用）或 `delete`（刪除） |

---

### GET /api/admin/system

**系統健康檢查**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |

**回傳**：各服務連線狀態與延遲（Supabase、Fly.io Python API、Stripe、Resend、Vercel 網站），環境變數設定狀態，整體健康度（healthy/degraded/unhealthy）。

---

### GET /api/admin/ai-balance

**AI API 餘額監控**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |

**回傳**：Claude (Anthropic)、DeepSeek、Kimi (Moonshot) 三個 AI 服務的帳戶餘額與狀態。

---

### GET /api/admin/feedback

**客戶反饋總覽**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `key` | string | ADMIN_KEY（必填） |

**回傳**：最近 200 筆客戶反饋（含評分、最有價值章節、改善建議、是否推薦，關聯報告資料）。

---

## 付款與結帳 API

### POST /api/checkout

**建立 Stripe 結帳 Session**

認證：Supabase Auth cookie（可選，用於驗證 email）

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `planCode` | string | 方案代碼：C/D/G15/R/E1/E2（必填） |
| `birthData` | object | 出生資料（必填） |
| `totalPrice` | number | R 方案可變價格（可選） |
| `locale` | string | 語言：`zh-TW` / `zh-CN` |
| `couponCode` | string | 優惠碼（可選） |
| `couponDiscount` | number | 折扣金額（可選） |
| `userEmail` | string | 用戶 email（可選，優先用 auth） |

**回傳**：`{ url: "stripe checkout URL" }` 或免費方案時直接回 dashboard URL。

birthData 存入 Supabase checkout_drafts（避免 Stripe metadata 500 字元限制），Stripe metadata 只存 draft_id。

---

### POST /api/webhook/stripe

**Stripe Webhook（checkout.session.completed）**

認證：Stripe Webhook 簽名驗證

處理流程：
1. 冪等性檢查（防止同一 session 重複處理）
2. 從 checkout_drafts 取回完整 birthData
3. 建立 paid_reports 記錄（status: pending）
4. 記錄優惠碼使用
5. 觸發 Workflow → Fallback 雙重報告生成機制

---

### GET /api/coupons/validate

**驗證優惠碼**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `code` | string | 優惠碼（必填，最長 50 字元） |
| `plan` | string | 方案代碼（可選） |
| `amount` | number | 原始金額（可選） |

**回傳**：`{ valid, discountType, discountValue, discountAmount, finalAmount, message }`

---

### POST /api/checkout/verify-family

**驗證家族藍圖成員（G15 結帳用）**

認證：Supabase Auth（必填）

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `emails` | string[] | 家庭成員 email（2-8 個） |

驗證每個 email 是否有已完成的人生藍圖（C 方案）報告。

---

### GET /api/checkout/search-reports

**搜尋已完成的人生藍圖報告（G15 結帳用）**

認證：Supabase Auth（必填）

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `email` | string | 精確搜尋（必須與登入 email 一致） |
| `q` | string | 姓名模糊搜尋（限登入用戶自己的報告） |

---

## 報告相關 API

### GET /api/reports

**取得用戶的報告列表**

認證：Supabase Auth（優先）→ Stripe session_id（fallback）

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `session_id` | string | Stripe checkout session ID（auth 失敗時的 fallback） |

**回傳**：最近 50 筆報告（含 plan_code、status、access_token、report_result、pdf_url 等）。

### PATCH /api/reports

**用戶重試失敗的報告**

認證：Supabase Auth（必填）

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `id` | string | 報告 ID |

限制：只能重試 failed 狀態的報告，最多重試 3 次。

### DELETE /api/reports

**刪除報告**

認證：Supabase Auth（必填）

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `id` | string | 報告 ID |

---

### POST /api/generate-report

**報告生成 API（Fallback 端點）**

內部呼叫，不對外公開。

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `reportId` | string | 報告 ID |

流程：排盤（Fly.io Python API）→ AI 分析（Claude Opus 4.6 / DeepSeek）→ QA 驗證 → 回寫 Supabase → 寄信（Resend）。maxDuration 300 秒。

---

### POST /api/workflows/generate-report

**Workflow 報告生成端點（主力）**

認證：`x-internal-secret` 或 `Authorization: Bearer <CRON_SECRET>`

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `reportId` | string | 報告 ID |

使用 Vercel Workflow（持久化），防重複觸發（generating/completed 跳過），回傳 runId。

---

### GET /api/report-progress/[runId]

**報告生成進度串流（SSE）**

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `startIndex` | number | 從第幾筆事件開始讀取（可選） |

回傳 Server-Sent Events 串流，客戶端用 EventSource 接收即時進度。

---

## 免費工具 API（無認證）

### POST /api/free-bazi

**免費八字命理速算**

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `year` | number | 出生年（必填） |
| `month` | number | 出生月（必填） |
| `day` | number | 出生日（必填） |
| `hour` | number | 出生時（預設 12） |
| `gender` | string | `M` / `F`（預設 M） |
| `name` | string | 姓名（可選） |
| `calendar_type` | string | `solar` / `lunar`（預設 solar） |

**回傳**：八字四柱、五行分佈、日主人格、AI 深度解讀（DeepSeek → Kimi fallback）。

---

### POST /api/free-name

**免費姓名學速算（五格剖象法）**

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `surname` | string | 姓（必填） |
| `givenName` | string | 名（必填） |
| `gender` | string | `M` / `F`（預設 M） |
| `year` | number | 出生年（可選） |
| `month` | number | 出生月（可選） |
| `day` | number | 出生日（可選） |

**回傳**：五格數理（天格/人格/地格/外格/總格）、各格吉凶、三才配置、康熙筆畫、AI 深度解讀。使用 102,998 字康熙筆畫資料庫（Unicode Unihan 官方）。

---

### POST /api/free-ziwei

**免費紫微斗數速算**

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `year` | number | 出生年（必填） |
| `month` | number | 出生月（必填） |
| `day` | number | 出生日（必填） |
| `hour` | number | 出生時（預設 12） |
| `gender` | string | `M` / `F`（預設 M） |
| `name` | string | 姓名（可選） |
| `calendar_type` | string | `solar` / `lunar`（預設 solar） |

**回傳**：命宮主星、十二宮位星曜、四化星、人格特質、AI 深度解讀。必須透過 Python API 排盤（TS 無法正確排盤）。

---

## 追蹤與統計 API

### POST /api/track

**訪客追蹤（地理/設備/頁面）**

無認證，前端 Tracker 元件自動呼叫。

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `session_id` | string | 瀏覽器 session ID |
| `page_path` | string | 頁面路徑 |
| `event_type` | string | 事件類型（預設 `pageview`） |
| `referrer` | string | 來源頁面（可選） |
| `duration_seconds` | number | 停留時間（可選） |
| `metadata` | object | 額外資料（可選） |

自動從 headers 取得：CF-Connecting-IP、User-Agent、CF-IPCountry、設備類型。

---

### GET /api/stats

**公開統計數據（首頁顯示用）**

無認證。

**回傳**：`{ count: number }` — 免費用戶去重人數 + 付費報告數 + 基數 1012。

---

## 客戶反饋 API

### POST /api/feedback

**提交或更新報告反饋**

認證：Supabase Auth（必填）

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `report_id` | string | 報告 ID（必填） |
| `rating` | number | 1-5 整數（必填） |
| `most_valuable` | string[] | 最有價值的章節（可選） |
| `suggestion` | string | 改善建議（可選，最多 500 字） |
| `would_recommend` | boolean | 是否推薦（可選） |

驗證用戶是否為報告擁有者，使用 upsert（同一用戶同一報告只能有一筆）。

### GET /api/feedback

**取得自己對某份報告的反饋**

認證：Supabase Auth（必填）

| 參數 | 類型 | 說明 |
|:---|:---|:---|
| `report_id` | string | 報告 ID（必填） |

---

## 家人管理 API

### GET /api/family-members

**取得用戶的所有家人**

認證：Supabase Auth（必填）

### POST /api/family-members

**新增家人**

認證：Supabase Auth（必填）

| Body 參數 | 類型 | 說明 |
|:---|:---|:---|
| `name` | string | 姓名（必填） |
| `gender` | string | `M` / `F`（必填） |
| `year` | number | 出生年（必填） |
| `month` | number | 出生月（必填） |
| `day` | number | 出生日（必填） |
| `hour` | number | 出生時（預設 12） |
| `minute` | number | 出生分（預設 0） |
| `time_mode` | string | `shichen` / `exact`（預設 shichen） |
| `calendar_type` | string | `solar` / `lunar`（預設 solar） |
| `lunar_leap` | boolean | 農曆閏月（預設 false） |
| `birth_city` | string | 出生城市 |
| `city_lat` | number | 緯度 |
| `city_lng` | number | 經度 |
| `city_tz` | number | 時區（預設 8） |

每位用戶最多 20 位家人。

### PATCH /api/family-members/[id]

**更新家人資料**

認證：Supabase Auth（必填），驗證擁有權。

### DELETE /api/family-members/[id]

**刪除家人**

認證：Supabase Auth（必填），驗證擁有權。

---

## Cron 任務（Vercel 排程）

### GET /api/cron/retry-pending

**自動重試卡住的報告**

排程：每 5 分鐘（`*/5 * * * *`）

認證：`Authorization: Bearer <CRON_SECRET>`

功能：
- 處理超過 5 分鐘的 pending/failed 報告（最多重試 3 次）
- 監控 generating 報告（30 分鐘超時標記 failed）
- 使用原子操作搶佔，防止多實例競爭

maxDuration: 60 秒

---

### GET /api/cron/keep-alive

**Fly.io Python API 保活**

排程：每 4 分鐘（`*/4 * * * *`）

認證：`Authorization: Bearer <CRON_SECRET>`

功能：ping Fly.io `/health` 端點，消除冷啟動延遲。

maxDuration: 30 秒

---

## 錯誤代碼

| HTTP 狀態碼 | 說明 |
|:---:|:---|
| 400 | 請求參數錯誤 |
| 401 | 未認證（需登入或 API Key） |
| 403 | 無權限（ADMIN_KEY 錯誤或非資料擁有者） |
| 404 | 資源不存在 |
| 409 | 資源衝突（如優惠碼已存在） |
| 429 | 超過重試次數限制 |
| 500 | 伺服器錯誤 |
| 502 | 上游服務不可用（Fly.io） |
| 503 | 服務暫時不可用 |
