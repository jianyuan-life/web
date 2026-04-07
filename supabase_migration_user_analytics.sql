-- 用戶分析表：記錄所有使用過鑑源服務的唯一用戶（免費+付費）
-- 用於首頁即時人數統計，以 (name, birth_year, birth_month, birth_day) 去重

CREATE TABLE IF NOT EXISTS user_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  birth_year integer NOT NULL,
  birth_month integer NOT NULL,
  birth_day integer NOT NULL,
  source text NOT NULL DEFAULT 'free',  -- 'free' 或 'paid'
  created_at timestamptz DEFAULT now(),
  UNIQUE (name, birth_year, birth_month, birth_day)
);

-- 啟用 RLS
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- 只允許 service_role 寫入（API route 使用 service_role key）
CREATE POLICY "Service role full access" ON user_analytics
  FOR ALL USING (true) WITH CHECK (true);

-- 索引：加速 count 查詢
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics (created_at);
