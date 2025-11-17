// 팀원
export interface Member {
  id: string;
  name: string;
  teamId: string;
  positionId: string;
  annualSalary: number;
  loginId: string;
  level: 'admin' | 'manager' | 'user'; // 총괄관리자, 팀관리자, 일반
  isApproved: boolean;
  isActive: boolean;
}

// 팀
export interface Team {
  id: string;
  name: string;
  isActive: boolean;
}

// 직급
export interface Position {
  id: string;
  name: string;
  isActive: boolean;
}

// 프로젝트
export interface Project {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  categoryId: string;
  status: 'planning' | 'inprogress' | 'completed' | 'paused'; // 진행예정, 진행중, 완료, 취소
  confirmed: boolean; // 확정여부
  contractAmount: number; // 계약금 (부가세 별도)
  teamId?: string; // 담당팀
  directCosts?: number; // 직접비 (재료비, 외주비 등)
  marginAmount?: number; // 기술료/마진
  paymentStage?: '선금' | '중도금' | '잔금' | '완료' | null; // 입금 단계
  memberAllocations?: Array<{
    memberId: string;
    balancePercent: number; // 배분 비율 (%)
  }>;
  starred?: boolean; // 즐겨찾기
  담당자?: string;
  연락처?: string;
  memo?: string;
}

// 프로젝트 구분
export interface ProjectCategory {
  id: string;
  name: string;
  isActive: boolean;
}

// 스케줄 (투입시간)
export interface Schedule {
  id: string;
  projectId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  minutes: number; // 투입시간(분)
}

// 입금내역
export interface Receipt {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  memo?: string;
}

// 지출내역
export interface Expense {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  category: string;
  memo?: string;
}

// 운영비
export interface Opex {
  id: string;
  yearMonth: string; // YYYY-MM
  amount: number;
  memo?: string;
}

// 휴일
export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'auto' | 'manual'; // 자동추가, 수동추가
}

// 근로시간 설정
export interface WorkTimeSetting {
  workMinutesPerDay: number; // 1일 근로시간(분), 기본 480(8시간)
}

// 프로젝트 인건비 배분
export interface ProjectMemberAllocation {
  id: string;
  projectId: string;
  memberId: string;
  allocatedAmount: number; // 배정된 계약금
  plannedDays: number; // 계획 참여일수
}

// 회사 정보
export interface CompanyInfo {
  name: string;
  logo?: string; // 로고 URL
}
