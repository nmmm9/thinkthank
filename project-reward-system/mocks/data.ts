import type {
  Team,
  Position,
  Member,
  ProjectCategory,
  Project,
  Schedule,
  Receipt,
  Expense,
  Opex,
  Holiday,
  WorkTimeSetting,
  CompanyInfo,
  ProjectMemberAllocation
} from '@/types';

// 팀 목록
export const teams: Team[] = [
  { id: 'team-1', name: '디자인팀', isActive: true },
  { id: 'team-2', name: 'BX팀', isActive: true },
  { id: 'team-3', name: '마팅', isActive: true },
];

// 직급 목록
export const positions: Position[] = [
  { id: 'pos-1', name: '대표', isActive: true },
  { id: 'pos-2', name: '디렉터', isActive: true },
  { id: 'pos-3', name: '매니저', isActive: true },
  { id: 'pos-4', name: '디자이너', isActive: true },
];

// 팀원 목록
export const members: Member[] = [
  {
    id: 'member-1',
    name: '관리자',
    teamId: 'team-1',
    positionId: 'pos-1',
    annualSalary: 57450000,
    loginId: 'admin@rewarding.com',
    level: 'admin',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-2',
    name: '정주희',
    teamId: 'team-2',
    positionId: 'pos-2',
    annualSalary: 45150000,
    loginId: 'ooo.think.jh@gmail.com',
    level: 'manager',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-3',
    name: '이효진',
    teamId: 'team-2',
    positionId: 'pos-4',
    annualSalary: 31000080,
    loginId: 'ooo.think.lhj@gmail.com',
    level: 'user',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-4',
    name: '이소문',
    teamId: 'team-2',
    positionId: 'pos-4',
    annualSalary: 36000000,
    loginId: 'ooo.think.lsy@gmail.com',
    level: 'user',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-5',
    name: '문태주',
    teamId: 'team-2',
    positionId: 'pos-2',
    annualSalary: 0,
    loginId: 'ideatj88@gmail.com',
    level: 'user',
    isApproved: false,
    isActive: false,
  },
];

// 프로젝트 구분
export const projectCategories: ProjectCategory[] = [
  { id: 'cat-1', name: '기획', isActive: true },
  { id: 'cat-2', name: '디자인', isActive: true },
  { id: 'cat-3', name: '문제', isActive: true },
  { id: 'cat-4', name: '마케팅', isActive: true },
  { id: 'cat-5', name: '어워드 & 프레스', isActive: true },
  { id: 'cat-6', name: '기획 + 디자인', isActive: true },
  { id: 'cat-7', name: 'BX', isActive: true },
];

// 프로젝트 목록
export const projects: Project[] = [
  {
    id: 'proj-1',
    name: 'test',
    startDate: '2025-10-22',
    endDate: '2025-10-29',
    categoryId: 'cat-1',
    status: 'planning',
    confirmed: false,
    contractAmount: 0,
    teamId: 'team-1',
    directCosts: 0,
    marginAmount: 0,
    paymentStage: null,
    memberAllocations: [],
  },
  {
    id: 'proj-2',
    name: '[2024/01] OOO BX * 신규설설',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    categoryId: 'cat-7',
    status: 'inprogress',
    confirmed: false,
    contractAmount: 0,
    teamId: 'team-2',
    directCosts: 0,
    marginAmount: 0,
    paymentStage: '선금',
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 60 },
      { memberId: 'member-3', balancePercent: 40 },
    ],
  },
  {
    id: 'proj-3',
    name: '[2025/09] 김포공항 국내선 1층 푸드코트 제안설계',
    startDate: '2025-09-26',
    endDate: '2025-10-13',
    categoryId: 'cat-1',
    status: 'planning',
    confirmed: false,
    contractAmount: 24979,
    teamId: 'team-1',
    directCosts: 1500000,
    marginAmount: 3000000,
    paymentStage: null,
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 50 },
      { memberId: 'member-2', balancePercent: 50 },
    ],
  },
  {
    id: 'proj-4',
    name: '[2025/09] 경희대학교 국제캠퍼스 기획설계',
    startDate: '2025-09-26',
    endDate: '2025-10-10',
    categoryId: 'cat-1',
    status: 'planning',
    confirmed: false,
    contractAmount: 0,
    teamId: 'team-1',
    directCosts: 800000,
    marginAmount: 1200000,
    paymentStage: null,
    memberAllocations: [],
  },
  {
    id: 'proj-5',
    name: '[2025/08] 인천사 CES 2026 콘텐츠 기획 제안 (비딩)',
    startDate: '2025-08-27',
    endDate: '2025-09-04',
    categoryId: 'cat-1',
    status: 'paused',
    confirmed: false,
    contractAmount: 299746,
    teamId: 'team-2',
    directCosts: 50000,
    marginAmount: 80000,
    paymentStage: null,
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 70 },
      { memberId: 'member-4', balancePercent: 30 },
    ],
  },
  {
    id: 'proj-6',
    name: '[2025/08] 경희대학교 서울캠퍼스 기획설계',
    startDate: '2025-08-11',
    endDate: '2025-10-17',
    categoryId: 'cat-1',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 10324786,
    teamId: 'team-1',
    directCosts: 2000000,
    marginAmount: 3500000,
    paymentStage: '중도금',
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 40 },
      { memberId: 'member-2', balancePercent: 35 },
      { memberId: 'member-3', balancePercent: 25 },
    ],
  },
  {
    id: 'proj-7',
    name: '[2025/07] 에가시스티_호텔CC 인성 브랜드 & 공간 리뉴얼 제안설계',
    startDate: '2025-07-07',
    endDate: '2025-10-31',
    categoryId: 'cat-6',
    status: 'inprogress',
    confirmed: false,
    contractAmount: 2885055,
    teamId: 'team-2',
    directCosts: 500000,
    marginAmount: 800000,
    paymentStage: '선금',
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 55 },
      { memberId: 'member-3', balancePercent: 45 },
    ],
  },
  {
    id: 'proj-8',
    name: '[2025/07] 기술슈퍼션 웹사이트 기능 추가건',
    startDate: '2025-07-07',
    endDate: '2025-09-30',
    categoryId: 'cat-2',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 14220509,
    teamId: 'team-2',
    directCosts: 3000000,
    marginAmount: 5000000,
    paymentStage: '잔금',
    memberAllocations: [
      { memberId: 'member-3', balancePercent: 60 },
      { memberId: 'member-4', balancePercent: 40 },
    ],
  },
  {
    id: 'proj-9',
    name: '[2025/06] OOO BX (기획고향+제안)',
    startDate: '2025-06-30',
    endDate: '2025-08-22',
    categoryId: 'cat-2',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 14000000,
    teamId: 'team-2',
    directCosts: 2500000,
    marginAmount: 4200000,
    paymentStage: '완료',
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 50 },
      { memberId: 'member-3', balancePercent: 30 },
      { memberId: 'member-4', balancePercent: 20 },
    ],
  },
];

// 스케줄 (더미 - 실제로는 더 많은 데이터 필요)
export const schedules: Schedule[] = [
  {
    id: 'sch-1',
    projectId: 'proj-3',
    memberId: 'member-2',
    date: '2025-10-31',
    minutes: 60,
  },
  {
    id: 'sch-2',
    projectId: 'proj-3',
    memberId: 'member-2',
    date: '2025-11-01',
    minutes: 0,
  },
];

// 입금내역
export const receipts: Receipt[] = [
  {
    id: 'rec-1',
    projectId: 'proj-6',
    date: '2025-08-15',
    amount: 5162393,
    memo: '계약금 50%',
  },
  {
    id: 'rec-2',
    projectId: 'proj-8',
    date: '2025-07-15',
    amount: 7110254,
    memo: '선금',
  },
  {
    id: 'rec-3',
    projectId: 'proj-9',
    date: '2025-07-01',
    amount: 7000000,
    memo: '선금 50%',
  },
];

// 지출내역 (더미)
export const expenses: Expense[] = [
  {
    id: 'exp-1',
    projectId: 'proj-6',
    date: '2025-08-20',
    amount: 500000,
    category: '외주비',
    memo: '3D 렌더링',
  },
];

// 운영비
export const opexList: Opex[] = [
  { id: 'op-1', yearMonth: '2025-06', amount: 16000000, memo: '' },
  { id: 'op-2', yearMonth: '2025-05', amount: 13000000, memo: '' },
  { id: 'op-3', yearMonth: '2025-04', amount: 13000000, memo: '' },
  { id: 'op-4', yearMonth: '2025-03', amount: 13000000, memo: '' },
  { id: 'op-5', yearMonth: '2025-02', amount: 13000000, memo: '' },
  { id: 'op-6', yearMonth: '2025-01', amount: 13000000, memo: '' },
  { id: 'op-7', yearMonth: '2024-07', amount: 34750420, memo: '' },
  { id: 'op-8', yearMonth: '2024-06', amount: 38930461, memo: '' },
  { id: 'op-9', yearMonth: '2024-05', amount: 31039681, memo: '' },
];

// 휴일
export const holidays: Holiday[] = [
  { id: 'h-1', date: '2025-01-01', name: '1월1일', type: 'auto' },
  { id: 'h-2', date: '2025-01-27', name: '임시공휴일', type: 'auto' },
  { id: 'h-3', date: '2025-01-28', name: '설날', type: 'auto' },
  { id: 'h-4', date: '2025-01-29', name: '설날', type: 'auto' },
  { id: 'h-5', date: '2025-01-30', name: '설날', type: 'auto' },
  { id: 'h-6', date: '2025-03-01', name: '삼일절', type: 'auto' },
  { id: 'h-7', date: '2025-03-03', name: '대체공휴일', type: 'auto' },
  { id: 'h-8', date: '2025-05-05', name: '부처님오신날', type: 'auto' },
  { id: 'h-9', date: '2025-05-06', name: '대체공휴일', type: 'auto' },
  { id: 'h-10', date: '2025-06-03', name: '임시공휴일(제82차 대통령 선거)', type: 'auto' },
  { id: 'h-11', date: '2025-06-06', name: '현충일', type: 'auto' },
  { id: 'h-12', date: '2025-07-17', name: '제헌절', type: 'auto' },
];

// 근로시간 설정
export const workTimeSetting: WorkTimeSetting = {
  workMinutesPerDay: 480, // 8시간 = 480분
};

// 회사 정보
export const companyInfo: CompanyInfo = {
  name: '(주)리워딩',
  logo: '',
};

// 프로젝트별 인건비 배분 (더미)
export const projectMemberAllocations: ProjectMemberAllocation[] = [
  {
    id: 'pma-1',
    projectId: 'proj-6',
    memberId: 'member-2',
    allocatedAmount: 10324786,
    plannedDays: 50,
  },
];
