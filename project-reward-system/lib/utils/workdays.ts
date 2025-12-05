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

// 시간 문자열을 분으로 변환 ("HH:MM" -> 분)
function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

// 스케줄의 업무시간 내 유효 분 계산
// schedule: { date, start_time, end_time, minutes }
// workHours: { start: "09:30", end: "18:30" }
export function calculateEffectiveMinutes(
  schedule: {
    date?: string;
    start_time: string | null;
    end_time: string | null;
    minutes: number;
  },
  workHours: {
    start: string;
    end: string;
  }
): number {
  // 주말인 경우 0 반환
  if (schedule.date) {
    const scheduleDate = new Date(schedule.date);
    const day = scheduleDate.getDay();
    if (day === 0 || day === 6) {
      return 0; // 토요일(6) 또는 일요일(0)
    }

    // 공휴일인 경우 0 반환
    if (!isWorkingDay(scheduleDate)) {
      return 0;
    }
  }

  // start_time이나 end_time이 없으면 전체 minutes 반환 (호환성)
  if (!schedule.start_time || !schedule.end_time) {
    return schedule.minutes;
  }

  const scheduleStart = timeToMinutes(schedule.start_time);
  const scheduleEnd = timeToMinutes(schedule.end_time);
  const workStart = timeToMinutes(workHours.start);
  const workEnd = timeToMinutes(workHours.end);

  // 스케줄이 업무시간과 전혀 겹치지 않는 경우
  if (scheduleEnd <= workStart || scheduleStart >= workEnd) {
    return 0;
  }

  // 겹치는 구간 계산
  const overlapStart = Math.max(scheduleStart, workStart);
  const overlapEnd = Math.min(scheduleEnd, workEnd);
  const effectiveMinutes = Math.max(0, overlapEnd - overlapStart);

  return effectiveMinutes;
}

// 스케줄 배열의 유효 분 합계 계산
export function calculateTotalEffectiveMinutes(
  schedules: Array<{
    start_time: string | null;
    end_time: string | null;
    minutes: number;
  }>,
  workHours: {
    start: string;
    end: string;
  }
): number {
  return schedules.reduce((total, schedule) => {
    return total + calculateEffectiveMinutes(schedule, workHours);
  }, 0);
}
