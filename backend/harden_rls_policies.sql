-- 1. Profiles Table Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Lab Reports Table Policies
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lab reports are viewable by everyone." ON lab_reports;
CREATE POLICY "Lab reports are viewable by everyone." ON lab_reports
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own lab reports." ON lab_reports;
CREATE POLICY "Users can insert their own lab reports." ON lab_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lab reports." ON lab_reports;
CREATE POLICY "Users can update own lab reports." ON lab_reports
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own lab reports." ON lab_reports;
CREATE POLICY "Users can delete own lab reports." ON lab_reports
    FOR DELETE USING (auth.uid() = user_id);
