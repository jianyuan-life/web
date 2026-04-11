-- 「我的家人」功能：儲存用戶家人出生資料
-- 請到 Supabase Dashboard → SQL Editor 執行此腳本

-- 建立 family_members 表
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  hour INTEGER NOT NULL DEFAULT 12,
  minute INTEGER NOT NULL DEFAULT 0,
  time_mode TEXT NOT NULL DEFAULT 'shichen' CHECK (time_mode IN ('unknown', 'shichen', 'exact')),
  calendar_type TEXT NOT NULL DEFAULT 'solar' CHECK (calendar_type IN ('solar', 'lunar')),
  lunar_leap BOOLEAN NOT NULL DEFAULT FALSE,
  birth_city TEXT,
  city_lat DOUBLE PRECISION DEFAULT 0,
  city_lng DOUBLE PRECISION DEFAULT 0,
  city_tz DOUBLE PRECISION DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按用戶查詢
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);

-- 每位用戶最多 20 位家人（用 trigger 強制）
CREATE OR REPLACE FUNCTION check_family_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM family_members WHERE user_id = NEW.user_id) >= 20 THEN
    RAISE EXCEPTION '每位用戶最多儲存 20 位家人';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_family_member_limit ON family_members;
CREATE TRIGGER enforce_family_member_limit
  BEFORE INSERT ON family_members
  FOR EACH ROW EXECUTE FUNCTION check_family_member_limit();

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_family_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_family_members_updated_at ON family_members;
CREATE TRIGGER set_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION update_family_members_updated_at();

-- RLS（行級安全策略）
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 用戶只能存取自己的家人資料
CREATE POLICY "Users can view own family members"
  ON family_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family members"
  ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- Service role 可以存取所有（API route 用）
CREATE POLICY "Service role full access"
  ON family_members FOR ALL
  USING (auth.role() = 'service_role');
