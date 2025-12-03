-- =====================================================
-- 성과 코멘트 테이블 및 RLS 정책
-- =====================================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS performance_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_performance_comments_org_id ON performance_comments(org_id);
CREATE INDEX IF NOT EXISTS idx_performance_comments_member_id ON performance_comments(member_id);
CREATE INDEX IF NOT EXISTS idx_performance_comments_project_id ON performance_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_comments_author_id ON performance_comments(author_id);

-- RLS 활성화
ALTER TABLE performance_comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책

-- SELECT: 본인에게 달린 코멘트 OR 본인이 작성한 코멘트 OR admin
CREATE POLICY "performance_comments_select" ON performance_comments
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND (
      member_id = get_user_member_id()  -- 본인에게 달린 코멘트
      OR author_id = get_user_member_id()  -- 본인이 작성한 코멘트
      OR is_admin()  -- 총괄관리자는 전체 조회
    )
  );

-- INSERT: manager 이상만 작성 가능
CREATE POLICY "performance_comments_insert" ON performance_comments
  FOR INSERT WITH CHECK (
    org_id = get_user_org_id()
    AND is_manager_or_above()
    AND author_id = get_user_member_id()  -- 작성자는 본인이어야 함
  );

-- UPDATE: 작성자 본인 OR admin
CREATE POLICY "performance_comments_update" ON performance_comments
  FOR UPDATE USING (
    org_id = get_user_org_id()
    AND (
      author_id = get_user_member_id()  -- 작성자 본인
      OR is_admin()  -- 총괄관리자
    )
  );

-- DELETE: 작성자 본인 OR admin
CREATE POLICY "performance_comments_delete" ON performance_comments
  FOR DELETE USING (
    org_id = get_user_org_id()
    AND (
      author_id = get_user_member_id()  -- 작성자 본인
      OR is_admin()  -- 총괄관리자
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_performance_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_performance_comments_updated_at ON performance_comments;
CREATE TRIGGER trigger_update_performance_comments_updated_at
  BEFORE UPDATE ON performance_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_comments_updated_at();
