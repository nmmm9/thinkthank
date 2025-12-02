-- =====================================================
-- CO.UP Row Level Security (RLS) 정책
-- 멀티테넌트 데이터 격리 및 역할 기반 접근 제어
-- =====================================================

-- =====================================================
-- 헬퍼 함수: 현재 사용자의 org_id 조회
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM members WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: 현재 사용자의 role 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM members WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: 현재 사용자의 member_id 조회
CREATE OR REPLACE FUNCTION get_user_member_id()
RETURNS UUID AS $$
  SELECT id FROM members WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: 현재 사용자의 team_id 조회
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM members WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: admin 여부 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: manager 이상 여부 확인
CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- RLS 활성화
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_member_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE opex ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_time_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. Organizations 정책
-- =====================================================
-- 자기 조직만 조회 가능
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT USING (id = get_user_org_id());

-- admin만 조직 정보 수정 가능
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND is_admin());

-- =====================================================
-- 2. Teams 정책
-- =====================================================
-- 자기 조직 팀 조회
CREATE POLICY "teams_select" ON teams
  FOR SELECT USING (org_id = get_user_org_id());

-- admin만 팀 생성/수정/삭제
CREATE POLICY "teams_insert" ON teams
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "teams_update" ON teams
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "teams_delete" ON teams
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 3. Positions 정책
-- =====================================================
CREATE POLICY "positions_select" ON positions
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "positions_insert" ON positions
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "positions_update" ON positions
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "positions_delete" ON positions
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 4. Project Categories 정책
-- =====================================================
CREATE POLICY "project_categories_select" ON project_categories
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "project_categories_insert" ON project_categories
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "project_categories_update" ON project_categories
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "project_categories_delete" ON project_categories
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 5. Members 정책
-- =====================================================
-- 자기 조직 멤버 조회 (승인된 멤버만)
CREATE POLICY "members_select" ON members
  FOR SELECT USING (
    org_id = get_user_org_id()
    OR auth_user_id = auth.uid()  -- 본인 정보는 항상 조회 가능
  );

-- admin만 멤버 추가
CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

-- admin: 모든 멤버 수정 / 본인: 자기 정보만 수정
CREATE POLICY "members_update" ON members
  FOR UPDATE USING (
    org_id = get_user_org_id()
    AND (is_admin() OR auth_user_id = auth.uid())
  );

-- admin만 멤버 삭제
CREATE POLICY "members_delete" ON members
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 6. Projects 정책
-- =====================================================
-- 자기 조직 프로젝트 조회
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (org_id = get_user_org_id());

-- manager 이상만 프로젝트 생성
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_manager_or_above());

-- manager 이상만 프로젝트 수정
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (org_id = get_user_org_id() AND is_manager_or_above());

-- admin만 프로젝트 삭제
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 7. Project Member Allocations 정책
-- =====================================================
CREATE POLICY "project_allocations_select" ON project_member_allocations
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "project_allocations_insert" ON project_member_allocations
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_manager_or_above());

CREATE POLICY "project_allocations_update" ON project_member_allocations
  FOR UPDATE USING (org_id = get_user_org_id() AND is_manager_or_above());

CREATE POLICY "project_allocations_delete" ON project_member_allocations
  FOR DELETE USING (org_id = get_user_org_id() AND is_manager_or_above());

-- =====================================================
-- 8. Schedules 정책
-- =====================================================
-- 자기 조직 스케줄 조회
CREATE POLICY "schedules_select" ON schedules
  FOR SELECT USING (org_id = get_user_org_id());

-- 본인 스케줄 생성 또는 manager 이상
CREATE POLICY "schedules_insert" ON schedules
  FOR INSERT WITH CHECK (
    org_id = get_user_org_id()
    AND (member_id = get_user_member_id() OR is_manager_or_above())
  );

-- 본인 스케줄 수정 또는 manager 이상
CREATE POLICY "schedules_update" ON schedules
  FOR UPDATE USING (
    org_id = get_user_org_id()
    AND (member_id = get_user_member_id() OR is_manager_or_above())
  );

-- 본인 스케줄 삭제 또는 manager 이상
CREATE POLICY "schedules_delete" ON schedules
  FOR DELETE USING (
    org_id = get_user_org_id()
    AND (member_id = get_user_member_id() OR is_manager_or_above())
  );

-- =====================================================
-- 9. Receipts 정책
-- =====================================================
CREATE POLICY "receipts_select" ON receipts
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "receipts_insert" ON receipts
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_manager_or_above());

CREATE POLICY "receipts_update" ON receipts
  FOR UPDATE USING (org_id = get_user_org_id() AND is_manager_or_above());

CREATE POLICY "receipts_delete" ON receipts
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 10. Expenses 정책
-- =====================================================
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_manager_or_above());

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (org_id = get_user_org_id() AND is_manager_or_above());

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 11. Opex 정책
-- =====================================================
CREATE POLICY "opex_select" ON opex
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "opex_insert" ON opex
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "opex_update" ON opex
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "opex_delete" ON opex
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 12. Holidays 정책
-- =====================================================
CREATE POLICY "holidays_select" ON holidays
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "holidays_insert" ON holidays
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "holidays_update" ON holidays
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "holidays_delete" ON holidays
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 13. Work Time Settings 정책
-- =====================================================
CREATE POLICY "work_time_settings_select" ON work_time_settings
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "work_time_settings_insert" ON work_time_settings
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "work_time_settings_update" ON work_time_settings
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

-- =====================================================
-- 14. Invitations 정책
-- =====================================================
-- admin만 초대 관리
CREATE POLICY "invitations_select" ON invitations
  FOR SELECT USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "invitations_update" ON invitations
  FOR UPDATE USING (org_id = get_user_org_id() AND is_admin());

CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE USING (org_id = get_user_org_id() AND is_admin());

-- 토큰으로 초대 조회 (회원가입 시 사용) - 별도 함수로 처리
CREATE OR REPLACE FUNCTION get_invitation_by_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  email TEXT,
  role TEXT,
  expires_at TIMESTAMPTZ
) AS $$
  SELECT id, org_id, email, role, expires_at
  FROM invitations
  WHERE token = invite_token
  AND expires_at > NOW()
  AND accepted_at IS NULL
$$ LANGUAGE sql SECURITY DEFINER;
