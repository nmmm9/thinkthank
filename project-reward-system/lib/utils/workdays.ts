// 공휴일 데이터 import
import holiday2025 from '@/holiday_2025.json';
import holiday2026 from '@/holiday_2026.json';

type HolidayItem = { date: string; name: string };

// 연도별 공휴일 데이터
const holidayData: { [key: number]: HolidayItem[] } = {
  2025: holiday2025['2025'],
  2026: holiday2026['2026'],
};

// 특정 연월의 공휴일 목록 가져오기
export function getHolidaysInMonth(year: number, month: number): string[] {
  const holidays = holidayData[year] || [];
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  return holidays
    .filter((h) => h.date.startsWith(prefix))
    .map((h) => h.date);
}

// 특정 날짜가 주말인지 확인
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0: 일요일, 6: 토요일
}

// 특정 연월의 근무일수 계산 (주말, 공휴일 제외)
export function getWorkingDaysInMonth(year: number, month: number): number {
  const holidays = getHolidaysInMonth(year, month);
  const holidaySet = new Set(holidays);

  // 해당 월의 총 일수
  const daysInMonth = new Date(year, month, 0).getDate();

  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 주말이 아니고 공휴일이 아닌 경우
    if (!isWeekend(date) && !holidaySet.has(dateStr)) {
      workingDays++;
    }
  }

  return workingDays;
}

// 특정 기간의 월별 근무일수 목록 가져오기
export function getWorkingDaysByMonth(
  startDate: string,
  endDate: string
): { yearMonth: string; workingDays: number }[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const result: { yearMonth: string; workingDays: number }[] = [];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    result.push({
      yearMonth,
      workingDays: getWorkingDaysInMonth(year, month),
    });

    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

// 스케줄 날짜에서 연월 추출
export function getYearMonthFromDate(date: string): string {
  return date.substring(0, 7); // "YYYY-MM"
}

// 모든 공휴일 Set 가져오기
function getAllHolidaysSet(): Set<string> {
  const allHolidays = new Set<string>();
  Object.values(holidayData).forEach((holidays) => {
    holidays.forEach((h) => allHolidays.add(h.date));
  });
  return allHolidays;
}

// 특정 날짜가 근무일인지 확인
export function isWorkingDay(date: Date): boolean {
  if (isWeekend(date)) return false;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const holidays = getAllHolidaysSet();
  return !holidays.has(dateStr);
}

// 시작일로부터 N 근무일 후의 날짜 계산 (종료일 구하기)
export function addWorkingDays(startDate: Date, workingDays: number): Date {
  const result = new Date(startDate);
  let remainingDays = workingDays;

  // 시작일이 근무일이면 첫날 포함
  if (isWorkingDay(result)) {
    remainingDays--;
  }

  while (remainingDays > 0) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result)) {
      remainingDays--;
    }
  }

  return result;
}

// 두 날짜 사이의 근무일수 계산 (시작일, 종료일 포함)
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}
