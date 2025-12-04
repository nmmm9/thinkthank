# 프로젝트 기능 문서

## 프로젝트 개요
**CO.UP** - 에이전시 맞춤형 성과 측정 서비스

프로젝트 기반 에이전시를 위한 종합 성과 관리 시스템입니다. 프로젝트 관리, 스케줄 추적, 비용 계산, 성과 배분을 자동화하여 효율적인 팀 운영을 지원합니다.

---

## 페이지별 기능 상세

### 1. 대시보드 (/)

**파일 경로**: `app/page.tsx`

**기능 설명**:
- 회사 전체의 프로젝트 성과를 한눈에 확인할 수 있는 메인 대시보드
- 올해 총 매출, 이번 달 성과, 총액 성과를 카드 형식으로 표시
- 월간 스케줄 캘린더와 팀 최신 프로젝트 목록 제공
- 상위 3개 프로젝트의 진행 상황을 카드로 시각화

**접근 권한**:
- 인증된 모든 사용자 (admin, manager, user)

**주요 기능**:
1. **성과 카드 표시**
   - 올해의 총 매출: 완료된 프로젝트의 계약금 합계
   - 이번 달 성과: 당월 프로젝트 이익 (계약금 - 투입비용)
   - 총액 성과: 전체 기간 누적 성과

2. **스케줄 캘린더**
   - 현재 월의 스케줄 표시
   - 오늘 날짜 강조 표시
   - 스케줄이 있는 날짜 시각적 표시

3. **팀 최신 프로젝트**
   - 진행 중인 프로젝트 최대 5개 표시
   - 프로젝트 상태, 기간, 진행률 표시
   - 실행률 계산 (시작일부터 오늘까지/전체 기간)

4. **상위 프로젝트 카드**
   - 진행 중인 프로젝트 중 상위 3개
   - 남은 기간 표시 (D-day 형식)
   - 즐겨찾기(별표) 기능
   - 프로젝트 성과 및 진행률 표시

**DB 테이블 연관**:
- `projects`: 프로젝트 정보 및 계약금
- `schedules`: 일정 및 투입 시간
- `members`: 팀원 정보 및 연봉
- `opexes`: 운영비 (판관비 계산용)
- `project_categories`: 프로젝트 유형
- `teams`: 팀 정보

**성과 계산 로직**:
```
총 매출 = Σ(완료된 프로젝트 계약금)
투입비용 = Σ(일별 인건비 + 일별 판관비) × 투입시간/8시간
영업이익 = 계약금 - 투입비용
수익률 = (영업이익 / 계약금) × 100
```

---

### 2. 로그인 (/login)

**파일 경로**: `app/login/page.tsx`

**기능 설명**:
- 사용자 인증 및 로그인 처리
- 이메일/비밀번호 기반 인증
- 회원가입 안내 (승인 대기 시스템)

**접근 권한**:
- 미인증 사용자 (public)

**주요 기능**:
1. **로그인 폼**
   - 이메일/비밀번호 입력
   - 로그인 중 상태 표시
   - 에러 메시지 표시

2. **자동 리다이렉트**
   - 로그인 성공 시 대시보드(/)로 이동
   - 이미 로그인된 경우 대시보드로 자동 이동

**DB 테이블 연관**:
- `members`: 사용자 인증 정보 (email, password_hash)
- Supabase Auth 시스템 활용

---

### 3. 스케줄 (/schedules)

**파일 경로**: `app/schedules/page.tsx`

**기능 설명**:
- 주간/월간 뷰로 팀원의 업무 스케줄을 관리
- 드래그 앤 드롭으로 스케줄 조정 가능
- 타임라인 기반 업무 입력 및 수정

**접근 권한**:
- 인증된 모든 사용자 (admin, manager, user)
- 본인의 스케줄만 입력/수정 가능

**주요 기능**:
1. **주간 뷰 (업무 입력)**
   - 시간대별 타임라인 (6시~22시)
   - 드래그로 스케줄 블록 이동
   - 상하 드래그로 시간 조정 (resize)
   - 좌우 드래그로 날짜 이동
   - 빈 공간 드래그로 새 스케줄 생성
   - 현재 시각 표시 (빨간 선)
   - 프로젝트별 색상 구분 (10가지 색상 팔레트)

2. **월간 뷰 (프로젝트 스케줄 확인)**
   - 월간 캘린더 형식
   - 프로젝트 기간 바(bar) 표시
   - 일별 스케줄 요약 (최대 2개 + 더보기)
   - 프로젝트 시작/종료일 시각화

3. **스케줄 모달**
   - 프로젝트 선택
   - 시작/종료 시간 입력 (AM/PM 형식)
   - 업무 시간 입력 (시간/분)
   - 업무 내용 메모
   - 같은 날짜에 여러 프로젝트 추가 가능
   - 총 업무 시간 자동 계산

4. **좌측 사이드바**
   - 월간 미니 캘린더
   - 내 프로젝트 목록
   - 프로젝트별 표시/숨김 토글
   - 프로젝트 색상 변경 (팔레트 선택)
   - 종료된 프로젝트 구분 표시

**DB 테이블 연관**:
- `schedules`: 스케줄 데이터 (날짜, 시간, 분, 프로젝트, 멤버)
  - `date`: 날짜
  - `start_time`: 시작 시간
  - `end_time`: 종료 시간
  - `minutes`: 총 업무 시간(분)
  - `description`: 업무 내용
  - `project_id`, `member_id`: 연관 관계
- `projects`: 프로젝트 정보 (색상 포함)
- `project_allocations`: 프로젝트 팀원 배정

**스케줄 계산 로직**:
```
- 15분 단위로 시간 조정
- 드래그 시 실시간 미리보기
- 시작시간 + 업무시간 = 종료시간 (자동 계산)
- 종료시간 - 시작시간 = 업무시간 (역계산)
```

---

### 4. 프로젝트 (/projects)

**파일 경로**: `app/projects/page.tsx`

**기능 설명**:
- 프로젝트 목록 관리 및 상세 정보 입력
- 프로젝트 추가/수정/삭제 (admin/manager만)
- 팀원 배정 및 투입 계획 수립

**접근 권한**:
- 조회: 모든 사용자
- 추가/수정: admin, manager만

**주요 기능**:
1. **프로젝트 목록**
   - 내가 참여 중인 프로젝트
   - 기타 진행 중인 프로젝트
   - 완료된 프로젝트
   - 즐겨찾기 토글
   - 검색 기능

2. **프로젝트 테이블**
   - 프로젝트명, 현황, 유형
   - 계약기간 및 계약금
   - 실행률 (진행 상황 바)
   - 수정 버튼 (관리자만)

3. **프로젝트 추가/수정 모달**
   - **기본 정보**
     - 프로젝트명, 유형, 현황
     - 계약 시작/종료일
     - 계약금

   - **팀원 배정**
     - 팀원 선택
     - 투입 시작일/종료일
     - 투입일수 (근무일 기준)
     - 1일 비용 자동 계산 (인건비 + 판관비)
     - 총 투입비용 자동 계산
     - 여러 팀원 동시 배정 가능

   - **직접비**
     - 외주, 장비 등 직접비 항목 추가
     - 항목별 금액 입력

   - **기술료**
     - 기술료율 설정 (기본 15%)
     - 기술료 = 총투입비용 × 기술료율

   - **성과 배분**
     - 회사:팀원 배분 비율 설정 (기본 80:20)
     - 슬라이더로 비율 조정

   - **총 계약금 계산**
     - 총투입비용 + 직접비 + 기술료

4. **운영비 부족 경고**
   - 팀원 투입 시 해당 월 운영비 체크
   - 운영비 < 전체 인건비인 경우 경고 표시
   - 운영비 설정 페이지로 바로가기 링크

**DB 테이블 연관**:
- `projects`: 프로젝트 기본 정보
  - `name`, `status`, `category_id`
  - `start_date`, `end_date`
  - `contract_amount`
  - `company_share_percent`: 회사 배분 비율
  - `memo`, `starred`
- `project_allocations`: 프로젝트 팀원 배정
  - `member_id`, `project_id`
  - `start_date`, `end_date`
  - `planned_days`: 계획 투입일수
  - `allocated_amount`: 배정 금액
- `project_categories`: 프로젝트 유형
- `members`: 팀원 정보 (연봉)
- `opexes`: 운영비 (판관비 계산)

**비용 계산 로직**:
```
해당월 근무일수 = 공휴일 제외한 평일 수
개인 연봉 비중 = 개인 연봉 / 전체 연봉
전체 월급 = 전체 연봉 / 12

판관비 = 운영비 - 전체 월급
1일 1인 판관비 = (판관비 × 개인 연봉 비중) / 해당월 근무일수
1일 인건비 = (개인 연봉 / 12) / 해당월 근무일수
1일 총 비용 = 1일 인건비 + 1일 판관비

총 투입비용 = 1일 총 비용 × 투입일수
```

---

### 5. 정산 (/settlement)

**파일 경로**: `app/settlement/page.tsx`

**기능 설명**:
- 프로젝트별 수익/비용 정산
- 영업이익 계산 및 정산 완료 처리
- 남은 기간에 따른 긴급도 표시

**접근 권한**:
- 조회: 모든 사용자
- 정산 완료 처리: admin, manager만

**주요 기능**:
1. **정산 테이블**
   - 프로젝트명, 계약기간
   - 남은 기간 (D-day, 색상 코드)
   - 현황, 유형
   - 계약금
   - 지출총액 (실제 투입비용)
   - 영업이익 및 수익률

2. **남은 기간 표시**
   - D-Day: 당일 (빨강)
   - D-3 이하: 빨강 강조
   - D-7 이하: 빨강
   - D-14 이하: 주황
   - D-30 이하: 노랑
   - 마감: 회색

3. **정산 완료 버튼** (관리자만)
   - 정산 완료/취소 토글
   - 정산 완료된 프로젝트만 성과 페이지에 반영
   - 완료 시각 기록

4. **필터링**
   - 연도별, 진행상태별, 구분별
   - 프로젝트명 검색

**DB 테이블 연관**:
- `projects`: 프로젝트 정보
  - `is_settled`: 정산 완료 여부
  - `settled_at`: 정산 완료 시각
- `schedules`: 실제 투입 시간
- `members`: 팀원 연봉
- `opexes`: 운영비

**지출총액 계산 로직**:
```
프로젝트 지출 = Σ(팀원별 투입비용)

팀원별 투입비용:
1. 스케줄을 월별로 그룹화
2. 각 월별로:
   - 해당월 근무일수 계산
   - 1일 인건비 = (연봉/12) / 근무일수
   - 1일 판관비 = (운영비 - 전체월급) × 연봉비중 / 근무일수
   - 참여일수 = 총 투입시간 / 8시간
   - 월별 비용 = (1일 인건비 + 1일 판관비) × 참여일수
3. 월별 비용 합산

영업이익 = 계약금 - 지출총액
수익률 = (영업이익 / 계약금) × 100
```

---

### 6. 성과 (/performance)

**파일 경로**: `app/performance/page.tsx`

**기능 설명**:
- 정산 완료된 프로젝트의 성과 확인
- 팀원별 효율성 및 배분금액 계산
- 관리자는 전체 성과, 일반 사용자는 본인 성과만 확인

**접근 권한**:
- admin/manager: 전체 프로젝트 성과 조회
- user: 본인이 참여한 프로젝트 성과만 조회

**주요 기능**:
1. **성과 요약**
   - 연도별 필터링
   - 총 성과 금액 표시
   - 정산 완료된 프로젝트 수

2. **프로젝트별 성과** (관리자)
   - 프로젝트명, 기간
   - 예상/실제 투입일수
   - 실제 성과 (영업이익)
   - 성과 배분 (회사/팀원)
   - 팀원별 상세 테이블
     - 예상/실제 투입
     - 절약 일수
     - 효율성(%)
     - 배분 비율 및 금액
     - 피드백 버튼

3. **내 성과** (일반 사용자)
   - 참여한 프로젝트 목록
   - 내 배분금액 표시
   - 예상/실제 투입일수
   - 절약 일수 및 효율성
   - 피드백 확인

4. **피드백 기능**
   - 관리자가 팀원에게 피드백 작성
   - 팀원은 자신의 피드백 확인
   - 실시간 알림 연동

**DB 테이블 연관**:
- `projects`: 정산 완료된 프로젝트 (`is_settled = true`)
- `project_allocations`: 계획 투입일수
- `schedules`: 실제 투입 시간
- `members`: 팀원 정보
- `opexes`: 운영비
- `performance_comments`: 피드백

**성과 배분 계산 로직**:
```
1. 팀원별 효율성 계산
   절약일수 = 계획일수 - 실제일수
   효율성(%) = (절약일수 / 계획일수) × 100

2. 프로젝트 성과
   실제 성과 = 계약금 - 실제 투입비용

3. 배분금액
   회사 배분 = 실제 성과 × 회사배분비율
   팀원 배분 = 실제 성과 × 팀원배분비율

4. 개인 배분
   - 효율성 > 0인 팀원만 배분 대상
   - 개인 배분비율 = 개인 효율성 / 전체 효율성 합계
   - 개인 배분금액 = 팀원 배분 × 개인 배분비율
```

---

### 7. 직원별 성과 (/admin/member-performance) - Admin 전용

**파일 경로**: `app/admin/member-performance/page.tsx`

**기능 설명**:
- 조직 내 모든 직원의 성과를 종합적으로 확인
- 직원별 참여 프로젝트 및 배분금액 통계

**접근 권한**:
- admin만 접근 가능 (총괄관리자 전용)

**주요 기능**:
1. **직원 목록**
   - 배분금액 순으로 정렬
   - 직원명, 팀, 참여 프로젝트 수
   - 평균 효율성, 총 절약일수
   - 총 배분금액

2. **직원 상세** (펼치기)
   - 참여 프로젝트별 성과
   - 프로젝트명, 기간
   - 예상/실제 투입일수
   - 절약일수, 효율성
   - 배분금액
   - 프로젝트별 합계

**DB 테이블 연관**:
- `members`: 전체 직원 정보
- `projects`: 정산 완료된 프로젝트
- `project_allocations`: 프로젝트 참여 정보
- `schedules`: 실제 투입 시간
- `opexes`: 운영비

---

### 8. 팀원 관리 (/settings/members)

**파일 경로**: `app/settings/members/page.tsx`

**기능 설명**:
- 조직 내 팀원 정보 관리
- 팀 배정, 연봉, 권한 설정

**접근 권한**:
- 조회: admin, manager
- 수정/삭제: admin만

**주요 기능**:
1. **팀원 목록**
   - 팀별, 레벨별 정렬
   - 팀원명, 팀, 연봉
   - 이메일, 레벨
   - 승인 여부, 활성 여부

2. **팀원 정보 수정** (admin만)
   - 팀 배정 (드롭다운)
   - 연봉 입력
   - 레벨 설정 (총괄관리자/팀관리자/일반)
   - 승인/활성 토글
   - 삭제 버튼

3. **연봉 블러 처리**
   - 총괄관리자: 모든 연봉 확인 가능
   - 팀관리자: 본인 연봉 + 일반 사원 연봉만 확인
   - 팀관리자 이상의 연봉은 블러 처리

4. **일괄 저장**
   - 여러 팀원 정보 동시 수정
   - 저장 버튼으로 일괄 처리
   - 수정된 행 강조 표시 (노란색 배경)

5. **페이지 이탈 경고**
   - 저장하지 않은 변경사항이 있을 때 경고

**DB 테이블 연관**:
- `members`: 팀원 정보
  - `name`, `email`, `team_id`
  - `annual_salary`: 연봉
  - `role`: 권한 (admin/manager/user)
  - `is_approved`: 승인 여부
  - `is_active`: 활성 여부
- `teams`: 팀 정보

---

### 9. 팀 설정 (/settings/org)

**파일 경로**: `app/settings/org/page.tsx`

**기능 설명**:
- 회사의 팀 구조 관리
- 팀 추가/수정/삭제

**접근 권한**:
- 조회: 모든 사용자
- 수정: admin만

**주요 기능**:
1. **팀 목록**
   - 팀명, 활성 여부
   - 추가/삭제 버튼

2. **팀 관리** (admin만)
   - 팀명 입력/수정
   - 활성/비활성 토글
   - 일괄 저장
   - 팀 삭제 (해당 팀 소속 멤버 없을 때만)

3. **신규 팀 추가**
   - 추가 버튼 클릭 시 새 행 생성
   - 파란색 배경으로 신규 표시
   - 저장 시 DB에 반영

**DB 테이블 연관**:
- `teams`: 팀 정보
  - `name`: 팀명
  - `is_active`: 활성 여부
  - `sort_order`: 정렬 순서

---

### 10. 운영비 (/settings/opex)

**파일 경로**: `app/settings/opex/page.tsx`

**기능 설명**:
- 월별 운영비 관리 (가계부 형식)
- 항목별 비용 입력 및 자동 합산

**접근 권한**:
- admin, manager (관리자급)

**주요 기능**:
1. **운영비 목록**
   - 연도별 필터링
   - 월별 카드 형식
   - 펼치기/접기 기능
   - 총 운영비 표시

2. **운영비 상세** (펼쳤을 때)
   - 항목별 입력 (항목명, 금액, 메모)
   - 항목 추가/삭제
   - 총 운영비 자동 계산
   - 저장 버튼

3. **운영비 추가**
   - 연월 선택 (과거 24개월 + 미래 12개월)
   - 중복 월 체크
   - 여러 항목 입력 가능

4. **운영비 삭제**
   - 월별 운영비 전체 삭제

**DB 테이블 연관**:
- `opexes`: 운영비 정보
  - `year_month`: 연월 (YYYY-MM)
  - `amount`: 총 운영비
  - `items`: 항목 상세 (JSON)
    - `id`, `category`, `amount`, `memo`

**운영비 활용**:
```
운영비는 프로젝트 비용 계산 시 판관비로 사용됩니다.

판관비 = 운영비 - 전체 팀원 월급
1일 1인 판관비 = (판관비 × 개인 연봉 비중) / 해당월 근무일수

프로젝트 비용 = Σ(1일 인건비 + 1일 판관비) × 투입일수
```

---

### 11. 휴일 및 근로시간 (/settings/worktime)

**파일 경로**: `app/settings/worktime/page.tsx`

**기능 설명**:
- 공휴일 관리 및 근로시간 설정
- 근무일수 계산에 활용

**접근 권한**:
- admin, manager

**주요 기능**:
1. **공휴일 목록**
   - 연도별 공휴일 표시
   - JSON 파일에서 데이터 로드
   - 휴일 날짜 및 명칭

2. **근로시간 설정**
   - 1일 근로시간(분) 입력
   - 기본값: 480분 (8시간)
   - 시간 변환 표시 (분 → 시간)

**데이터 소스**:
- `holiday_2025.json`: 2025년 공휴일
- `holiday_2026.json`: 2026년 공휴일

**활용**:
```
- 근무일수 계산 시 공휴일 제외
- 스케줄 투입일수 = 총 투입분 / 1일 근로시간
- 프로젝트 기간 계산 시 공휴일 제외
```

---

### 12. 기타 설정 (/settings/misc)

**파일 경로**: `app/settings/misc/page.tsx`

**기능 설명**:
- 프로젝트 구분(카테고리) 관리
- 회사 정보 설정

**접근 권한**:
- admin, manager

**주요 기능**:
1. **프로젝트 구분**
   - 프로젝트 유형 목록
   - 구분명 입력/수정
   - 활성/비활성 토글
   - 추가/저장/삭제

2. **회사 정보**
   - 회사 이름
   - 회사 로고 업로드
   - 로고 미리보기

**DB 테이블 연관**:
- `project_categories`: 프로젝트 구분
  - `name`: 구분명
  - `is_active`: 활성 여부
- `organizations`: 회사 정보
  - `name`: 회사명
  - `logo_url`: 로고 URL

---

## DB 테이블 구조 및 연관 관계

### 핵심 테이블

1. **organizations** (회사)
   - id, name, logo_url, created_at

2. **members** (팀원)
   - id, org_id, name, email, password_hash
   - team_id (→ teams)
   - annual_salary, role, is_active, is_approved

3. **teams** (팀)
   - id, org_id, name, is_active, sort_order

4. **projects** (프로젝트)
   - id, org_id, category_id (→ project_categories)
   - name, status, start_date, end_date
   - contract_amount, company_share_percent
   - is_settled, settled_at, starred, memo, color

5. **project_categories** (프로젝트 구분)
   - id, org_id, name, is_active

6. **project_allocations** (프로젝트 팀원 배정)
   - id, project_id (→ projects), member_id (→ members)
   - start_date, end_date, planned_days
   - allocated_amount, balance_percent

7. **schedules** (스케줄)
   - id, org_id, project_id (→ projects), member_id (→ members)
   - date, minutes, start_time, end_time
   - description

8. **opexes** (운영비)
   - id, org_id, year_month, amount
   - items (JSON), memo

9. **performance_comments** (성과 피드백)
   - id, project_id (→ projects), member_id (→ members)
   - comment, created_by (→ members)
   - created_at

10. **work_time_settings** (근로시간 설정)
    - id, org_id, work_minutes_per_day

### 연관 관계 다이어그램

```
organizations (회사)
    ├── members (팀원)
    │     ├── teams (팀)
    │     ├── schedules (스케줄)
    │     └── project_allocations (프로젝트 배정)
    │
    ├── projects (프로젝트)
    │     ├── project_categories (구분)
    │     ├── project_allocations (팀원 배정)
    │     ├── schedules (스케줄)
    │     └── performance_comments (피드백)
    │
    ├── opexes (운영비)
    └── work_time_settings (근로시간 설정)
```

---

## 권한 체계

### 사용자 레벨

1. **admin (총괄관리자)**
   - 모든 기능 접근 가능
   - 팀원 관리, 운영비 설정, 정산 처리
   - 전체 직원 성과 조회
   - 프로젝트 추가/수정/삭제

2. **manager (팀관리자)**
   - 프로젝트 추가/수정 가능
   - 팀원 조회 (연봉 일부 블러)
   - 운영비 관리
   - 팀 설정 조회

3. **user (일반 사용자)**
   - 대시보드, 스케줄, 프로젝트 조회
   - 본인 스케줄 입력/수정
   - 본인 성과 조회
   - 설정 페이지 접근 불가

### 페이지별 권한 요약

| 페이지 | admin | manager | user |
|--------|-------|---------|------|
| 대시보드 | ✓ | ✓ | ✓ |
| 로그인 | - | - | - |
| 스케줄 | ✓ | ✓ | ✓ (본인만) |
| 프로젝트 | ✓ (수정) | ✓ (수정) | ✓ (조회) |
| 정산 | ✓ (정산 처리) | ✓ (조회) | ✓ (조회) |
| 성과 | ✓ (전체) | ✓ (전체) | ✓ (본인) |
| 직원별 성과 | ✓ | ✗ | ✗ |
| 팀원 관리 | ✓ (수정) | ✓ (조회) | ✗ |
| 팀 설정 | ✓ (수정) | ✓ (조회) | ✗ |
| 운영비 | ✓ | ✓ | ✗ |
| 휴일/근로시간 | ✓ | ✓ | ✗ |
| 기타설정 | ✓ | ✓ | ✗ |

---

## 주요 계산 로직 정리

### 1. 비용 계산

```javascript
// 해당월 근무일수 (공휴일 제외)
workingDaysInMonth = getWorkingDaysInMonth(year, month)

// 개인 연봉 비중
salaryRatio = member.annual_salary / totalAnnualSalary

// 전체 월급
totalMonthlySalary = totalAnnualSalary / 12

// 판관비 (운영비에서 전체 월급 제외)
adminExpense = max(0, opexAmount - totalMonthlySalary)

// 1일 1인 판관비
dailyOpex = (adminExpense × salaryRatio) / workingDaysInMonth

// 1일 인건비
dailyCost = (member.annual_salary / 12) / workingDaysInMonth

// 1일 총 비용
dailyTotalCost = dailyCost + dailyOpex

// 프로젝트 총 투입비용
totalInvestment = dailyTotalCost × plannedDays
```

### 2. 성과 계산

```javascript
// 실제 투입일수
actualDays = totalMinutes / 480  // 8시간 기준

// 실제 투입비용
actualInvestment = dailyTotalCost × actualDays

// 프로젝트 실제 성과
actualPerformance = contractAmount - actualInvestment

// 성과 배분
companyShare = actualPerformance × (companySharePercent / 100)
teamShare = actualPerformance × (teamSharePercent / 100)
```

### 3. 효율성 및 개인 배분

```javascript
// 팀원별 효율성
savedDays = plannedDays - actualDays
efficiencyRate = (savedDays / plannedDays) × 100

// 개인 배분 비율 (효율성 양수인 팀원만)
totalEfficiency = Σ(팀원별 efficiencyRate where efficiencyRate > 0)
sharePercent = (개인 efficiencyRate / totalEfficiency) × 100

// 개인 배분금액
shareAmount = teamShare × (sharePercent / 100)
```

---

## 기술 스택

- **프론트엔드**: Next.js 14 (App Router), React, TypeScript
- **스타일링**: Tailwind CSS
- **백엔드**: Supabase (PostgreSQL)
- **인증**: Supabase Auth
- **날짜 처리**: date-fns
- **아이콘**: lucide-react

---

## 주요 특징

1. **실시간 계산**: 프로젝트 비용, 성과, 배분금액을 자동 계산
2. **드래그 앤 드롭**: 직관적인 스케줄 관리
3. **권한 기반 접근 제어**: 사용자 레벨에 따른 기능 제한
4. **가계부 형식 운영비**: 항목별 비용 관리 및 자동 합산
5. **효율성 기반 배분**: 절약 실적에 따른 공정한 성과 배분
6. **정산 완료 시스템**: 정산 완료된 프로젝트만 성과에 반영
7. **피드백 시스템**: 팀원별 성과 피드백 관리

---

## 향후 개선 가능 사항

1. 입금/잔금 내역 관리 기능 완성 (Receipt 모달)
2. 프로젝트 구분(카테고리) CRUD 완성
3. 회사 로고 업로드 기능 구현
4. 공휴일 추가/삭제 기능 구현
5. 비밀번호 변경 기능 구현
6. 알림 시스템 구현
7. 대시보드 차트 시각화 강화
8. 엑셀 내보내기 기능
9. 월별 성과 추이 그래프
10. 팀별 성과 비교 분석

---

**문서 버전**: 1.0
**작성일**: 2025-12-03
**프로젝트**: CO.UP - 에이전시 맞춤형 성과 측정 서비스
