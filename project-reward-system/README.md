# CO.UP - 프로젝트 성과 관리 시스템

에이전시 맞춤형 성과 측정 및 리워드 계산 시스템입니다.

## 🚀 배포 가능 상태

✅ **백엔드 없이 배포 가능** - 모든 데이터가 프론트엔드에 내장됨
✅ **Vercel, Netlify, Cloudflare Pages 지원**
✅ **정적 빌드 완료** - 즉시 배포 가능

## 기능

### 주요 페이지
- **대시보드** (`/`) - 전체 현황 요약 및 그래프 자리
- **스케줄** (`/schedules`) - 프로젝트별 팀원 투입시간 관리 (HH:MM 단위 입력)
- **프로젝트** (`/projects`) - 프로젝트 목록 및 상태/기간/실행률 관리
- **정산** (`/settlement`) - 매출·지출·잔금·영업이익 관리
- **성과** (`/performance`) - 팀/팀원별 성과 및 리워드 계산

### 설정 페이지
- **팀원** (`/settings/members`) - 사용자·직급·승인권한 관리
- **팀·직급** (`/settings/org`) - 팀명/직급 설정
- **운영비** (`/settings/opex`) - 월별 운영비 관리
- **휴일 및 근로시간** (`/settings/worktime`) - 근로시간(분)·공휴일 관리
- **기타설정** (`/settings/misc`) - 프로젝트 구분·회사정보

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **State Management**: 준비됨 (Zustand - 필요시 추가)

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어서 확인하세요.

포트 3002로 실행하려면:
```bash
npm run dev -- -p 3002
```

### 로그인 정보 (개발용)

빠른 로그인 버튼 사용 또는 아래 계정 정보 입력:
- **CEO**: `admin@rewarding.com`
- **팀장**: `ooo.think.jh@gmail.com`
- **일반사원**: `ooo.think.lhj@gmail.com`

(비밀번호는 더미 데이터이므로 아무 값이나 입력)

### 빌드

```bash
npm run build
```

### 프로덕션 서버 실행

```bash
npm start
```

## 프로젝트 구조

```
project-reward-system/
├── app/                    # Next.js 앱 라우터 페이지
│   ├── page.tsx           # 대시보드
│   ├── schedules/         # 스케줄 페이지
│   ├── projects/          # 프로젝트 페이지
│   ├── settlement/        # 정산 페이지
│   ├── performance/       # 성과 페이지
│   └── settings/          # 설정 페이지들
├── components/            # 재사용 가능한 컴포넌트
│   ├── Sidebar.tsx       # 사이드바 네비게이션
│   ├── FilterBar.tsx     # 필터 바
│   ├── DataTable.tsx     # 데이터 테이블
│   ├── TimeCell.tsx      # HH:MM 입력 셀
│   ├── Modal.tsx         # 모달 컴포넌트
│   └── ...
├── mocks/                 # 더미 데이터
│   └── data.ts
├── types/                 # TypeScript 타입 정의
│   └── index.ts
└── lib/                   # 유틸리티 함수들
```

## 주요 기능 설명

### 스케줄 관리
- HH:MM 형식으로 투입시간 입력 (예: 1:30, 8:00)
- 내부적으로 분 단위로 저장
- 참여일수 자동 계산: 총투입분 ÷ 근로시간(분)

### 프로젝트 관리
- 실행률 자동 집계 (기간 기반)
- 프로젝트 추가/수정 모달
- 잔여일수 자동 계산

### 정산 관리
- 입금내역 관리
- 영업이익 자동 계산
- 잔금 자동 계산

### 성과 분석
- 1일 매출원가 = 연봉 ÷ (12 × 20.917)
- 1일 판관비 = (운영비 × 연봉비중) ÷ 근무가능일수
- 1일 투입비 = 매출원가 + 판관비
- 성과 = 팀원 계약금 – 총투입비용

## 🌐 배포하기

### Vercel로 배포 (추천, 가장 쉬움)

1. **GitHub에 프로젝트 업로드**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

2. **Vercel 배포**
   - [Vercel](https://vercel.com)에 접속
   - "Import Project" 클릭
   - GitHub 리포지토리 선택
   - 자동 배포 완료! (약 2분 소요)

### Netlify로 배포

1. GitHub에 프로젝트 업로드 (위와 동일)
2. [Netlify](https://www.netlify.com)에 접속
3. "Add new site" > "Import an existing project" 선택
4. GitHub 리포지토리 연결
5. Build 설정:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Deploy 클릭

### 배포 후 확인사항

✅ 로그인 페이지가 정상적으로 보이는지 확인
✅ 빠른 로그인 버튼으로 로그인 테스트
✅ 모든 페이지 접근 가능 여부 확인
✅ 데이터가 정상적으로 표시되는지 확인

## 데이터베이스 연동

현재는 더미 데이터(`mocks/data.ts`)를 사용하고 있습니다.
실제 데이터베이스 연동 시:

1. 백엔드 API 설정
2. `mocks/data.ts` 대신 API 호출로 변경
3. Zustand store를 사용하여 상태 관리

## 개발 참고사항

- 모든 금액은 부가세 별도 기준
- 기본 근로시간: 480분 (8시간)
- 아이콘:
  - ✏️ 수정
  - 🔒 저장
  - 🗑 삭제
  - ➕ 추가
  - 토글 (보라색=활성, 회색=비활성)

## 라이센스

Private Project
