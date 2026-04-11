-- ============================================================
-- 客戶反饋表 report_feedback
-- 每份報告每位用戶只能反饋一次（可更新）
-- ============================================================

CREATE TABLE IF NOT EXISTS report_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES paid_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  most_valuable TEXT[],
  suggestion TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_report_feedback_report_id ON report_feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_report_feedback_user_id ON report_feedback(user_id);

-- updated_at 自動更新 trigger
CREATE OR REPLACE FUNCTION update_report_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_feedback_updated_at
  BEFORE UPDATE ON report_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_report_feedback_updated_at();

-- RLS
ALTER TABLE report_feedback ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看/新增/更新自己的反饋
CREATE POLICY "用戶可查看自己的反饋"
  ON report_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用戶可新增自己的反饋"
  ON report_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用戶可更新自己的反饋"
  ON report_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role 可以完全存取（後台管理用）
-- service_role 預設會略過 RLS，無需額外 policy
