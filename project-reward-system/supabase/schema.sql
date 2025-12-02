-- =====================================================
-- CO.UP 멀티테넌트 데이터베이스 스키마
-- Supabase (PostgreSQL)
-- =====================================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 조직 (Organizations) - 멀티테넌트 핵심
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                              -- 회사/에이전시명
  slug TEXT UNIQUE NOT NULL,                       -- URL용 고유 식별자 (예: thinkthank)
  logo_url TEXT,                                   -- 로고 이미지 URL
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),
  max_members INTEGER DEFAULT 5,                   -- 플랜별 최대 멤버 수
  settings JSONB DEFAULT '{}',                     -- 추가 설정 (JSON)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 조직 슬러그 인덱스
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- =====================================================
-- 2. 팀 (Teams)
-- =====================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 조직 내 팀명 중복 방지
  UNIQUE(org_id, name)
);

-- 조직별 팀 조회 인덱스
CREATE INDEX idx_teams_org_id ON teams(org_id);

-- =====================================================
-- 3. 직급 (Positions)
-- =====================================================
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 0,                         -- 직급 레벨 (정렬/비교용)
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, name)
);

CREATE INDEX idx_positions_org_id ON positions(org_id);

-- =====================================================
-- 4. 프로젝트 카테고리 (Project Categories)
-- =====================================================
CREATE TABLE project_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, name)
);

CREATE INDEX idx_project_categories_org_id ON project_categories(org_id);

-- =====================================================
-- 5. 멤버 (Members) - Supabase Auth와 연동
-- =====================================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- Supabase Auth 연동

  -- 기본 정보
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  login_id TEXT,                                   -- 별도 로그인 ID (선택)

  -- 조직 내 역할
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),

  -- 급여 정보
  annual_salary INTEGER DEFAULT 0,                 -- 연봉 (원)

  -- 상태
  is_approved BOOLEAN DEFAULT false,               -- 가입 승인 여부
  is_active BOOLEAN DEFAULT true,                  -- 활성 상태
  join_date DATE DEFAULT CURRENT_DATE,             -- 입사일

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 조직 내 이메일 중복 방지
  UNIQUE(org_id, email)
);

CREATE INDEX idx_members_org_id ON members(org_id);
CREATE INDEX idx_members_auth_user_id ON members(auth_user_id);
CREATE INDEX idx_members_team_id ON members(team_id);

-- =====================================================
-- 6. 프로젝트 (Projects)
-- =====================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 기본 정보
  name TEXT NOT NULL,
  category_id UUID REFERENCES project_categories(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'inprogress', 'completed', 'paused')),

  -- 일정
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 금액 정보
  contract_amount INTEGER DEFAULT 0,               -- 계약금 (부가세 별도)
  direct_costs INTEGER DEFAULT 0,                  -- 직접비 (재료비, 외주비 등)
  margin_amount INTEGER DEFAULT 0,                 -- 기술료/마진

  -- 진행 상태
  confirmed BOOLEAN DEFAULT false,                 -- 확정 여부
  payment_stage TEXT CHECK (payment_stage IN ('선금', '중도금', '잔금', '완료')),
  starred BOOLEAN DEFAULT false,                   -- 즐겨찾기

  -- 담당자 정보
  contact_name TEXT,                               -- 담당자명
  contact_phone TEXT,                              -- 연락처
  memo TEXT,                                       -- 메모

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);
CREATE INDEX idx_projects_date_range ON projects(org_id, start_date, end_date);

-- =====================================================
-- 7. 프로젝트 멤버 배분 (Project Member Allocations)
-- =====================================================
CREATE TABLE project_member_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  balance_percent DECIMAL(5,2) DEFAULT 0,          -- 배분 비율 (%)
  allocated_amount INTEGER DEFAULT 0,              -- 배정된 금액
  planned_days INTEGER DEFAULT 0,                  -- 계획 참여일수

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, member_id)
);

CREATE INDEX idx_project_allocations_org_id ON project_member_allocations(org_id);
CREATE INDEX idx_project_allocations_project_id ON project_member_allocations(project_id);
CREATE INDEX idx_project_allocations_member_id ON project_member_allocations(member_id);

-- =====================================================
-- 8. 스케줄/투입시간 (Schedules)
-- =====================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  minutes INTEGER DEFAULT 0 CHECK (minutes >= 0),  -- 투입시간(분)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 날짜, 같은 프로젝트, 같은 멤버 중복 방지
  UNIQUE(project_id, member_id, date)
);

CREATE INDEX idx_schedules_org_id ON schedules(org_id);
CREATE INDEX idx_schedules_project_id ON schedules(project_id);
CREATE INDEX idx_schedules_member_id ON schedules(member_id);
CREATE INDEX idx_schedules_date ON schedules(org_id, date);

-- =====================================================
-- 9. 입금내역 (Receipts)
-- =====================================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_org_id ON receipts(org_id);
CREATE INDEX idx_receipts_project_id ON receipts(project_id);
CREATE INDEX idx_receipts_date ON receipts(org_id, date);

-- =====================================================
-- 10. 지출내역 (Expenses)
-- =====================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT,                                   -- 지출 카테고리
  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_org_id ON expenses(org_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_date ON expenses(org_id, date);

-- =====================================================
-- 11. 운영비 (Opex)
-- =====================================================
CREATE TABLE opex (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  year_month TEXT NOT NULL,                        -- YYYY-MM 형식
  amount INTEGER NOT NULL CHECK (amount >= 0),
  memo TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 조직, 같은 월 중복 방지
  UNIQUE(org_id, year_month)
);

CREATE INDEX idx_opex_org_id ON opex(org_id);
CREATE INDEX idx_opex_year_month ON opex(org_id, year_month);

-- =====================================================
-- 12. 휴일 (Holidays)
-- =====================================================
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'manual' CHECK (type IN ('auto', 'manual')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, date)
);

CREATE INDEX idx_holidays_org_id ON holidays(org_id);
CREATE INDEX idx_holidays_date ON holidays(org_id, date);

-- =====================================================
-- 13. 근로시간 설정 (Work Time Settings)
-- =====================================================
CREATE TABLE work_time_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  work_minutes_per_day INTEGER DEFAULT 480,        -- 1일 근로시간(분), 기본 8시간

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 14. 초대 (Invitations) - 멤버 초대 관리
-- =====================================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  invited_by UUID REFERENCES members(id) ON DELETE SET NULL,

  token TEXT UNIQUE NOT NULL,                      -- 초대 토큰
  expires_at TIMESTAMPTZ NOT NULL,                 -- 만료 시간
  accepted_at TIMESTAMPTZ,                         -- 수락 시간

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id, email)
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org_id ON invitations(org_id);

-- =====================================================
-- updated_at 자동 갱신 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_member_allocations_updated_at BEFORE UPDATE ON project_member_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opex_updated_at BEFORE UPDATE ON opex FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_time_settings_updated_at BEFORE UPDATE ON work_time_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
