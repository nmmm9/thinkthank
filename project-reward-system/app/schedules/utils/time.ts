// 시간 문자열을 분으로 변환 (HH:mm -> 분)
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};

// 분을 시간 문자열로 변환 (분 -> HH:mm)
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// 시간에서 시 추출
export const getTimeHour = (time: string): string => {
  if (!time) return '';
  return time.split(':')[0] || '';
};

// 시간에서 분 추출
export const getTimeMinute = (time: string): string => {
  if (!time) return '';
  return time.split(':')[1] || '';
};

// 시/분을 합쳐서 시간 문자열로
export const combineTime = (hour: string, minute: string): string => {
  if (!hour) return '';
  const h = String(hour).padStart(2, '0');
  const m = String(minute || '0').padStart(2, '0');
  return `${h}:${m}`;
};

// 시간 라벨 포맷 (AM/PM)
export const formatHourLabel = (hour: number): string => {
  if (hour === 0) return 'AM 12';
  if (hour < 12) return `AM ${hour}`;
  if (hour === 12) return 'PM 12';
  return `PM ${hour - 12}`;
};

// 시간 옵션 (0~23) with AM/PM 표시
export const hourOptions = Array.from({ length: 24 }, (_, i) => {
  let displayHour: number;
  let period: string;

  if (i === 0) {
    displayHour = 12;
    period = 'AM';
  } else if (i < 12) {
    displayHour = i;
    period = 'AM';
  } else if (i === 12) {
    displayHour = 12;
    period = 'PM';
  } else {
    displayHour = i - 12;
    period = 'PM';
  }

  return {
    value: i,
    label: `${period} ${displayHour}시`
  };
});

// 분 옵션 (0, 15, 30, 45)
export const minuteOptions = [0, 15, 30, 45];
