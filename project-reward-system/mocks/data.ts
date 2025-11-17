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
  { id: 'team-2', name: '개발팀', isActive: true },
  { id: 'team-3', name: '기획팀', isActive: true },
];

// 직급 목록
export const positions: Position[] = [
  { id: 'pos-1', name: '대표', isActive: true },
  { id: 'pos-2', name: '팀장', isActive: true },
  { id: 'pos-3', name: '매니저', isActive: true },
  { id: 'pos-4', name: '사원', isActive: true },
];

// 팀원 목록
export const members: Member[] = [
  {
    id: 'member-1',
    name: '김대표',
    teamId: 'team-1',
    positionId: 'pos-1',
    annualSalary: 72000000,
    loginId: 'admin@company.com',
    level: 'admin',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-2',
    name: '정주희',
    teamId: 'team-2',
    positionId: 'pos-2',
    annualSalary: 54000000,
    loginId: 'ooo.think.jh@gmail.com',
    level: 'manager',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-3',
    name: '박디자이너',
    teamId: 'team-1',
    positionId: 'pos-4',
    annualSalary: 42000000,
    loginId: 'park@company.com',
    level: 'user',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-4',
    name: '이개발',
    teamId: 'team-2',
    positionId: 'pos-3',
    annualSalary: 48000000,
    loginId: 'lee@company.com',
    level: 'user',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-5',
    name: '최기획',
    teamId: 'team-3',
    positionId: 'pos-3',
    annualSalary: 45000000,
    loginId: 'choi@company.com',
    level: 'user',
    isApproved: true,
    isActive: true,
  },
  {
    id: 'member-6',
    name: '강신입',
    teamId: 'team-2',
    positionId: 'pos-4',
    annualSalary: 36000000,
    loginId: 'kang@company.com',
    level: 'user',
    isApproved: true,
    isActive: true,
  },
];

// 프로젝트 구분
export const projectCategories: ProjectCategory[] = [
  { id: 'cat-1', name: '웹 개발', isActive: true },
  { id: 'cat-2', name: '앱 개발', isActive: true },
  { id: 'cat-3', name: 'UI/UX 디자인', isActive: true },
  { id: 'cat-4', name: '브랜딩', isActive: true },
  { id: 'cat-5', name: '컨설팅', isActive: true },
  { id: 'cat-6', name: '유지보수', isActive: true },
];

// 프로젝트 목록 (현재 날짜: 2025-11-16 기준)
export const projects: Project[] = [
  // 진행 중인 프로젝트들 (여러 주에 걸쳐있음 - 캘린더 테스트용)
  {
    id: 'proj-1',
    name: 'A기업 홈페이지 리뉴얼',
    startDate: '2025-10-28',
    endDate: '2025-12-10',
    categoryId: 'cat-1',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 24000000,
    teamId: 'team-2',
    directCosts: 2000000,
    marginAmount: 3600000,
    paymentStage: '중도금',
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 40 },
      { memberId: 'member-4', balancePercent: 35 },
      { memberId: 'member-6', balancePercent: 25 },
    ],
    starred: true,
  },
  {
    id: 'proj-2',
    name: 'B쇼핑몰 모바일 앱 개발',
    startDate: '2025-11-01',
    endDate: '2026-01-31',
    categoryId: 'cat-2',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 48000000,
    teamId: 'team-2',
    directCosts: 5000000,
    marginAmount: 7200000,
    paymentStage: '선금',
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 30 },
      { memberId: 'member-2', balancePercent: 40 },
      { memberId: 'member-4', balancePercent: 30 },
    ],
    starred: true,
  },
  {
    id: 'proj-3',
    name: 'C회사 브랜드 아이덴티티 구축',
    startDate: '2025-11-05',
    endDate: '2025-11-25',
    categoryId: 'cat-4',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 15000000,
    teamId: 'team-1',
    directCosts: 1000000,
    marginAmount: 2250000,
    paymentStage: '선금',
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 50 },
      { memberId: 'member-3', balancePercent: 50 },
    ],
    starred: false,
  },
  {
    id: 'proj-4',
    name: 'D스타트업 MVP 개발',
    startDate: '2025-11-10',
    endDate: '2025-12-20',
    categoryId: 'cat-1',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 32000000,
    teamId: 'team-2',
    directCosts: 3000000,
    marginAmount: 4800000,
    paymentStage: '선금',
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 35 },
      { memberId: 'member-4', balancePercent: 40 },
      { memberId: 'member-6', balancePercent: 25 },
    ],
    starred: true,
  },
  {
    id: 'proj-5',
    name: 'E대학교 포털 사이트 개발',
    startDate: '2025-09-01',
    endDate: '2025-11-30',
    categoryId: 'cat-1',
    status: 'inprogress',
    confirmed: true,
    contractAmount: 56000000,
    teamId: 'team-2',
    directCosts: 8000000,
    marginAmount: 8400000,
    paymentStage: '잔금',
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 25 },
      { memberId: 'member-2', balancePercent: 35 },
      { memberId: 'member-4', balancePercent: 25 },
      { memberId: 'member-5', balancePercent: 15 },
    ],
    starred: false,
  },

  // 진행 예정 프로젝트
  {
    id: 'proj-6',
    name: 'F병원 예약 시스템 구축',
    startDate: '2025-11-25',
    endDate: '2026-02-28',
    categoryId: 'cat-1',
    status: 'planning',
    confirmed: false,
    contractAmount: 68000000,
    teamId: 'team-2',
    directCosts: 10000000,
    marginAmount: 10200000,
    paymentStage: null,
    memberAllocations: [
      { memberId: 'member-2', balancePercent: 30 },
      { memberId: 'member-4', balancePercent: 40 },
      { memberId: 'member-6', balancePercent: 30 },
    ],
    starred: false,
  },
  {
    id: 'proj-7',
    name: 'G기업 CI/BI 리뉴얼',
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    categoryId: 'cat-4',
    status: 'planning',
    confirmed: false,
    contractAmount: 18000000,
    teamId: 'team-1',
    directCosts: 1500000,
    marginAmount: 2700000,
    paymentStage: null,
    memberAllocations: [
      { memberId: 'member-3', balancePercent: 60 },
      { memberId: 'member-5', balancePercent: 40 },
    ],
    starred: false,
  },

  // 완료된 프로젝트
  {
    id: 'proj-8',
    name: 'H카페 브랜딩 프로젝트',
    startDate: '2025-09-15',
    endDate: '2025-10-31',
    categoryId: 'cat-4',
    status: 'completed',
    confirmed: true,
    contractAmount: 12000000,
    teamId: 'team-1',
    directCosts: 800000,
    marginAmount: 1800000,
    paymentStage: '완료',
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 40 },
      { memberId: 'member-3', balancePercent: 60 },
    ],
    starred: false,
  },
  {
    id: 'proj-9',
    name: 'I쇼핑몰 유지보수',
    startDate: '2025-08-01',
    endDate: '2025-10-31',
    categoryId: 'cat-6',
    status: 'completed',
    confirmed: true,
    contractAmount: 9000000,
    teamId: 'team-2',
    directCosts: 500000,
    marginAmount: 1350000,
    paymentStage: '완료',
    memberAllocations: [
      { memberId: 'member-4', balancePercent: 70 },
      { memberId: 'member-6', balancePercent: 30 },
    ],
    starred: false,
  },
  {
    id: 'proj-10',
    name: 'J스타트업 컨설팅',
    startDate: '2025-10-01',
    endDate: '2025-10-25',
    categoryId: 'cat-5',
    status: 'completed',
    confirmed: true,
    contractAmount: 8000000,
    teamId: 'team-3',
    directCosts: 300000,
    marginAmount: 1200000,
    paymentStage: '완료',
    memberAllocations: [
      { memberId: 'member-1', balancePercent: 60 },
      { memberId: 'member-5', balancePercent: 40 },
    ],
    starred: false,
  },

  // 취소된 프로젝트
  {
    id: 'proj-11',
    name: 'K레스토랑 앱 개발 (비딩 탈락)',
    startDate: '2025-10-15',
    endDate: '2025-10-20',
    categoryId: 'cat-2',
    status: 'paused',
    confirmed: false,
    contractAmount: 0,
    teamId: 'team-2',
    directCosts: 0,
    marginAmount: 0,
    paymentStage: null,
    memberAllocations: [],
    starred: false,
  },
  {
    id: 'proj-12',
    name: 'L회사 홈페이지 제안 (계약 불발)',
    startDate: '2025-09-20',
    endDate: '2025-09-25',
    categoryId: 'cat-1',
    status: 'paused',
    confirmed: false,
    contractAmount: 0,
    teamId: 'team-2',
    directCosts: 0,
    marginAmount: 0,
    paymentStage: null,
    memberAllocations: [],
    starred: false,
  },
];

// 스케줄 (2025년 11월 10일 ~ 11월 16일 주간 데이터)
// member-2 (정주희) 중심으로 작성 - 세로 막대 그래프 테스트용
export const schedules: Schedule[] = [
  // 11월 10일 (일요일) - 휴무

  // 11월 11일 (월요일) - member-2: proj-1 (5시간), proj-2 (3시간) = 총 8시간
  {
    id: 'sch-1',
    projectId: 'proj-1',
    memberId: 'member-2',
    date: '2025-11-11',
    minutes: 300, // 5시간 = 62.5%
  },
  {
    id: 'sch-2',
    projectId: 'proj-2',
    memberId: 'member-2',
    date: '2025-11-11',
    minutes: 180, // 3시간 = 37.5%
  },

  // 11월 12일 (화요일) - member-2: proj-4 (6시간) = 총 6시간
  {
    id: 'sch-3',
    projectId: 'proj-4',
    memberId: 'member-2',
    date: '2025-11-12',
    minutes: 360, // 6시간 = 75%
  },

  // 11월 13일 (수요일) - member-2: proj-1 (4시간), proj-5 (4시간) = 총 8시간
  {
    id: 'sch-4',
    projectId: 'proj-1',
    memberId: 'member-2',
    date: '2025-11-13',
    minutes: 240, // 4시간 = 50%
  },
  {
    id: 'sch-5',
    projectId: 'proj-5',
    memberId: 'member-2',
    date: '2025-11-13',
    minutes: 240, // 4시간 = 50%
  },

  // 11월 14일 (목요일) - member-2: proj-2 (7시간) = 총 7시간
  {
    id: 'sch-6',
    projectId: 'proj-2',
    memberId: 'member-2',
    date: '2025-11-14',
    minutes: 420, // 7시간 = 87.5%
  },

  // 11월 15일 (금요일) - member-2: proj-4 (3시간), proj-5 (2시간), proj-1 (2시간) = 총 7시간
  {
    id: 'sch-7',
    projectId: 'proj-4',
    memberId: 'member-2',
    date: '2025-11-15',
    minutes: 180, // 3시간 = 37.5%
  },
  {
    id: 'sch-8',
    projectId: 'proj-5',
    memberId: 'member-2',
    date: '2025-11-15',
    minutes: 120, // 2시간 = 25%
  },
  {
    id: 'sch-9',
    projectId: 'proj-1',
    memberId: 'member-2',
    date: '2025-11-15',
    minutes: 120, // 2시간 = 25%
  },

  // 11월 16일 (토요일) - 휴무

  // 다른 팀원들 스케줄 (일부)
  {
    id: 'sch-10',
    projectId: 'proj-1',
    memberId: 'member-4',
    date: '2025-11-11',
    minutes: 480, // 8시간
  },
  {
    id: 'sch-11',
    projectId: 'proj-2',
    memberId: 'member-4',
    date: '2025-11-12',
    minutes: 420, // 7시간
  },
  {
    id: 'sch-12',
    projectId: 'proj-3',
    memberId: 'member-3',
    date: '2025-11-11',
    minutes: 360, // 6시간
  },
  {
    id: 'sch-13',
    projectId: 'proj-4',
    memberId: 'member-6',
    date: '2025-11-13',
    minutes: 480, // 8시간
  },
  {
    id: 'sch-14',
    projectId: 'proj-5',
    memberId: 'member-5',
    date: '2025-11-14',
    minutes: 300, // 5시간
  },
];

// 입금내역
export const receipts: Receipt[] = [
  // proj-1 (A기업 홈페이지)
  {
    id: 'rec-1',
    projectId: 'proj-1',
    date: '2025-10-28',
    amount: 12000000,
    memo: '선금 (50%)',
  },
  {
    id: 'rec-2',
    projectId: 'proj-1',
    date: '2025-11-15',
    amount: 6000000,
    memo: '중도금 (25%)',
  },

  // proj-2 (B쇼핑몰 앱)
  {
    id: 'rec-3',
    projectId: 'proj-2',
    date: '2025-11-01',
    amount: 24000000,
    memo: '선금 (50%)',
  },

  // proj-3 (C회사 브랜딩)
  {
    id: 'rec-4',
    projectId: 'proj-3',
    date: '2025-11-05',
    amount: 7500000,
    memo: '선금 (50%)',
  },

  // proj-4 (D스타트업 MVP)
  {
    id: 'rec-5',
    projectId: 'proj-4',
    date: '2025-11-10',
    amount: 16000000,
    memo: '선금 (50%)',
  },

  // proj-5 (E대학교 포털)
  {
    id: 'rec-6',
    projectId: 'proj-5',
    date: '2025-09-01',
    amount: 28000000,
    memo: '선금 (50%)',
  },
  {
    id: 'rec-7',
    projectId: 'proj-5',
    date: '2025-10-15',
    amount: 14000000,
    memo: '중도금 (25%)',
  },
  {
    id: 'rec-8',
    projectId: 'proj-5',
    date: '2025-11-10',
    amount: 14000000,
    memo: '잔금 (25%)',
  },

  // proj-8 (H카페 브랜딩 - 완료)
  {
    id: 'rec-9',
    projectId: 'proj-8',
    date: '2025-09-15',
    amount: 6000000,
    memo: '선금',
  },
  {
    id: 'rec-10',
    projectId: 'proj-8',
    date: '2025-10-31',
    amount: 6000000,
    memo: '잔금',
  },

  // proj-9 (I쇼핑몰 유지보수 - 완료)
  {
    id: 'rec-11',
    projectId: 'proj-9',
    date: '2025-08-01',
    amount: 9000000,
    memo: '일시불',
  },

  // proj-10 (J스타트업 컨설팅 - 완료)
  {
    id: 'rec-12',
    projectId: 'proj-10',
    date: '2025-10-25',
    amount: 8000000,
    memo: '일시불',
  },
];

// 지출내역
export const expenses: Expense[] = [
  // proj-1 지출
  {
    id: 'exp-1',
    projectId: 'proj-1',
    date: '2025-11-01',
    amount: 1500000,
    category: '서버 호스팅',
    memo: '1년 계약',
  },
  {
    id: 'exp-2',
    projectId: 'proj-1',
    date: '2025-11-05',
    amount: 500000,
    category: '외주 디자인',
    memo: '로고 디자인',
  },

  // proj-2 지출
  {
    id: 'exp-3',
    projectId: 'proj-2',
    date: '2025-11-03',
    amount: 3000000,
    category: '외주 개발',
    memo: 'iOS 네이티브 개발',
  },
  {
    id: 'exp-4',
    projectId: 'proj-2',
    date: '2025-11-08',
    amount: 2000000,
    category: '라이센스',
    memo: '디자인 툴 라이센스',
  },

  // proj-3 지출
  {
    id: 'exp-5',
    projectId: 'proj-3',
    date: '2025-11-07',
    amount: 800000,
    category: '인쇄비',
    memo: '명함/스티커 제작',
  },

  // proj-5 지출
  {
    id: 'exp-6',
    projectId: 'proj-5',
    date: '2025-09-10',
    amount: 5000000,
    category: '외주 개발',
    memo: '백엔드 개발',
  },
  {
    id: 'exp-7',
    projectId: 'proj-5',
    date: '2025-10-01',
    amount: 3000000,
    category: '서버/인프라',
    memo: 'AWS 클라우드 비용',
  },
];

// 운영비
export const opexes: Opex[] = [
  {
    id: 'opex-1',
    yearMonth: '2025-08',
    amount: 8500000,
    memo: '사무실 임대료, 전기세, 인터넷',
  },
  {
    id: 'opex-2',
    yearMonth: '2025-09',
    amount: 8800000,
    memo: '사무실 임대료, 전기세, 인터넷, 비품구입',
  },
  {
    id: 'opex-3',
    yearMonth: '2025-10',
    amount: 8500000,
    memo: '사무실 임대료, 전기세, 인터넷',
  },
  {
    id: 'opex-4',
    yearMonth: '2025-11',
    amount: 9200000,
    memo: '사무실 임대료, 전기세, 인터넷, 회식비',
  },
];

// 휴일
export const holidays: Holiday[] = [
  { id: 'hol-1', date: '2025-01-01', name: '신정', type: 'auto' },
  { id: 'hol-2', date: '2025-03-01', name: '삼일절', type: 'auto' },
  { id: 'hol-3', date: '2025-05-05', name: '어린이날', type: 'auto' },
  { id: 'hol-4', date: '2025-06-06', name: '현충일', type: 'auto' },
  { id: 'hol-5', date: '2025-08-15', name: '광복절', type: 'auto' },
  { id: 'hol-6', date: '2025-10-03', name: '개천절', type: 'auto' },
  { id: 'hol-7', date: '2025-10-09', name: '한글날', type: 'auto' },
  { id: 'hol-8', date: '2025-12-25', name: '크리스마스', type: 'auto' },
  { id: 'hol-9', date: '2025-11-20', name: '회사창립기념일', type: 'manual' },
];

// 근로시간 설정
export const workTimeSettings: WorkTimeSetting = {
  workMinutesPerDay: 480, // 8시간
};

// 회사 정보
export const companyInfo: CompanyInfo = {
  name: 'CO.UP',
  logo: undefined,
};
