-- 推薦碼/點數獎勵系統 — 資料表建立
-- 2026-04-12 | 客戶服務部門設計

-- 1. 用戶推薦碼
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT referral_codes_user_unique UNIQUE (user_id),
  CONSTRAINT referral_codes_code_unique UNIQUE (code)
);

-- 2. 推薦記錄
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id),
  referred_user_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'registered', -- registered / purchased
  order_stripe_session_id TEXT,
  referrer_points_awarded INTEGER DEFAULT 0,
  referred_points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  purchased_at TIMESTAMPTZ,
  CONSTRAINT referrals_referred_unique UNIQUE (referred_user_id)
);

-- 3. 用戶點數餘額
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  total_expired INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_points_user_unique UNIQUE (user_id)
);

-- 4. 點數交易記錄
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- earn_referral / earn_welcome / use_checkout / expire / admin_adjust
  amount INTEGER NOT NULL, -- 正數=獲得，負數=使用/過期
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT,
  expires_at TIMESTAMPTZ, -- NULL = 永不過期
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_expire ON point_transactions(user_id, expires_at) WHERE expires_at IS NOT NULL;

-- RLS 政策
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 用戶只能看自己的推薦碼
CREATE POLICY "Users can view own referral code" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- 用戶只能看自己推薦的記錄
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

-- 用戶只能看自己的點數
CREATE POLICY "Users can view own points" ON user_points
  FOR SELECT USING (auth.uid() = user_id);

-- 用戶只能看自己的交易記錄
CREATE POLICY "Users can view own transactions" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- paid_reports 新增查看追蹤欄位（如果尚未新增）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'paid_reports' AND column_name = 'view_count') THEN
    ALTER TABLE paid_reports ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'paid_reports' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE paid_reports ADD COLUMN last_viewed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'paid_reports' AND column_name = 'pdf_download_count') THEN
    ALTER TABLE paid_reports ADD COLUMN pdf_download_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'paid_reports' AND column_name = 'last_downloaded_at') THEN
    ALTER TABLE paid_reports ADD COLUMN last_downloaded_at TIMESTAMPTZ;
  END IF;
END $$;
