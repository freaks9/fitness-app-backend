-- 1. profiles テーブル (ユーザー基本情報)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  goal_calories INT4,
  target_sodium FLOAT4 DEFAULT 2.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. lab_reports テーブル (ラボ用・共有研究報告)
CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  image_url TEXT,
  nutrients JSONB NOT NULL, -- カロリー, P, F, C, 塩分, ビタミン等の詳細データ
  comment TEXT, -- 日本語の検証メモ
  replicate_count INT4 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. daily_logs テーブル (個人用の食事・体組成記録)
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL, -- 'meal' または 'body'
  data JSONB NOT NULL, -- 摂取栄養素または体重・体脂肪率
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Lab Reports Policies
CREATE POLICY "Lab reports are viewable by everyone." ON lab_reports
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own lab reports." ON lab_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Logs Policies
CREATE POLICY "Users can view own daily logs." ON daily_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs." ON daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage setup (Bucket creation usually via dashboard or API)
-- Note: 'meal-images' bucket should be created in Supabase Dashboard.

-- ==========================================
-- STORAGE POLICIES (Bucket: meal-images)
-- ==========================================
-- 1. Create a bucket named 'meal-images'
-- 2. Make it public if images are intended to be seen by everyone

-- Allow public to read images
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'meal-images' );

-- Allow authenticated (including anonymous) users to upload images
-- CREATE POLICY "User Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'meal-images' AND auth.role() IN ('authenticated', 'anon') );
