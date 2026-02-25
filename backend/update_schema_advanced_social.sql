-- 1. 返信機能のための自己参照カラムを追加
ALTER TABLE lab_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES lab_comments(id) ON DELETE CASCADE;

-- 2. 通知テーブルの作成
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 通知を受け取るユーザー
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,     -- アクションを起こしたユーザー
    type TEXT NOT NULL,                                               -- 'comment', 'reply', 'like'
    reference_id UUID NOT NULL,                                       -- 関連するコメントIDまたは投稿ID
    message TEXT,                                                     -- 通知メッセージ
    is_read BOOLEAN DEFAULT false,                                    -- 既読フラグ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS（行レベルセキュリティ）の設定
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 自分の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- 自分の通知のみ更新可能（既読フラグの更新用）
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
