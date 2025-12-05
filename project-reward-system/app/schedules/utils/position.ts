import { differenceInDays, addDays } from 'date-fns';
import type { Schedule, Project } from '@/lib/supabase/database.types';
import type { SchedulePosition, PositionedSchedule, ProjectBar } from '../types';
import { HOUR_HEIGHT, START_HOUR } from '../constants';
import { timeToMinutes } from './time';

// 스케줄 블록의 위치 계산
export function getSchedulePosition(schedule: Schedule): SchedulePosition {
  const startTime = (schedule as any).start_time;
  const endTime = (schedule as any).end_time;

  if (!startTime || !endTime) {
    // 시간이 없으면 기본 위치
    return { top: 0, height: HOUR_HEIGHT };
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const startFromTop = (startMinutes / 60 - START_HOUR) * HOUR_HEIGHT;
  const duration = (endMinutes - startMinutes) / 60 * HOUR_HEIGHT;

  return {
    top: Math.max(0, startFromTop),
    height: Math.max(30, duration), // 최소 높이 30px
  };
}

// 겹치는 스케줄 처리
export function getOverlappingSchedules(daySchedules: Schedule[]): PositionedSchedule[] {
  if (daySchedules.length === 0) return [];

  // 각 스케줄의 시작/끝 위치 미리 계산
  const scheduleData = daySchedules.map((schedule) => {
    const pos = getSchedulePosition(schedule);
    return {
      schedule,
      top: pos.top,
      bottom: pos.top + pos.height,
      column: 0,
      totalColumns: 1,
    };
  });

  // 시작 시간 순으로 정렬
  scheduleData.sort((a, b) => a.top - b.top);

  // 1단계: 각 스케줄의 컬럼 배치
  scheduleData.forEach((current, index) => {
    // 현재 스케줄과 겹치는 이전 스케줄들 찾기
    const overlapping = scheduleData.slice(0, index).filter(
      (other) => !(current.top >= other.bottom || current.bottom <= other.top)
    );

    // 사용 가능한 컬럼 찾기
    const usedColumns = new Set(overlapping.map((o) => o.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column++;
    }
    current.column = column;
  });

  // 2단계: 겹치는 그룹별로 totalColumns 계산
  const visited = new Set<number>();

  const findOverlapGroup = (startIdx: number): number[] => {
    const group: number[] = [];
    const queue = [startIdx];

    while (queue.length > 0) {
      const idx = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      group.push(idx);

      const current = scheduleData[idx];
      scheduleData.forEach((other, otherIdx) => {
        if (!visited.has(otherIdx) && !(current.top >= other.bottom || current.bottom <= other.top)) {
          queue.push(otherIdx);
        }
      });
    }

    return group;
  };

  // 각 그룹의 totalColumns 설정
  for (let i = 0; i < scheduleData.length; i++) {
    if (!visited.has(i)) {
      const group = findOverlapGroup(i);
      const maxColumn = Math.max(...group.map((idx) => scheduleData[idx].column)) + 1;
      group.forEach((idx) => {
        scheduleData[idx].totalColumns = maxColumn;
      });
    }
  }

  return scheduleData.map(({ schedule, column, totalColumns }) => ({
    schedule,
    column,
    totalColumns,
  }));
}

// 프로젝트 바 계산 (월간 뷰)
export function getProjectBars(
  project: Project,
  displayDays: Date[],
  monthStartDay: number // monthStart.getDay()
): ProjectBar[] {
  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);

  const firstDay = displayDays[0];
  const lastDay = displayDays[displayDays.length - 1];

  if (endDate < firstDay || startDate > lastDay) {
    return [];
  }

  const actualStart = startDate < firstDay ? firstDay : startDate;
  const actualEnd = endDate > lastDay ? lastDay : endDate;

  const bars: ProjectBar[] = [];
  let currentDate = actualStart;

  while (currentDate <= actualEnd) {
    const dayIndex = differenceInDays(currentDate, firstDay);
    const rowIndex = Math.floor((dayIndex + monthStartDay) / 7);
    const colInRow = (dayIndex + monthStartDay) % 7;

    const daysLeftInRow = 7 - colInRow;
    const daysLeftInProject = differenceInDays(actualEnd, currentDate) + 1;
    const barWidth = Math.min(daysLeftInRow, daysLeftInProject);

    bars.push({
      row: rowIndex,
      col: colInRow,
      width: barWidth,
      startDate: currentDate,
    });

    currentDate = addDays(currentDate, barWidth);
  }

  return bars;
}

// 프로젝트 레이어 계산
export function getProjectLayer(
  project: Project,
  barStartDate: Date,
  visibleProjectsList: Project[]
): number {
  const projectsOnSameDay = visibleProjectsList.filter((p) => {
    const pStart = new Date(p.start_date);
    const pEnd = new Date(p.end_date);
    return barStartDate >= pStart && barStartDate <= pEnd;
  });

  return projectsOnSameDay.findIndex((p) => p.id === project.id);
}
