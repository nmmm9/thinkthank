'use client';

import { useRef, useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { HOUR_HEIGHT, START_HOUR, TOTAL_HOURS } from '../../constants';
import { WeekHeader } from './WeekHeader';
import { TimeColumn } from './TimeColumn';
import { DayColumn } from './DayColumn';
import type { Schedule, Project, Member, WorkTimeSetting } from '@/lib/supabase/database.types';
import type { ColorInfo, DragType, ContextMenuState, ViewingScheduleState } from '../../types';

interface WeekViewProps {
  currentDate: Date;
  schedules: Schedule[];
  projects: Project[];
  member: Member | null;
  teamMembers: Member[];
  workTimeSetting: WorkTimeSetting | null;
  isCreating: boolean;
  createDay: Date | null;
  createStartHour: number;
  createEndHour: number;
  isDragging: boolean;
  dragScheduleId: string | null;
  getLunchTimeForDate: (dateStr: string) => { start: string; end: string };
  lunchDragDate: string | null;
  isLunchDragging: boolean;
  getDaySchedules: (date: Date) => Schedule[];
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  openScheduleModal: (date: Date, hour?: number) => void;
  openEditModal: (schedule: Schedule, date: Date) => void;
  setViewingSchedule: (data: ViewingScheduleState | null) => void;
  setContextMenu: (data: ContextMenuState | null) => void;
  handleDragStart: (e: React.MouseEvent, scheduleId: string, type: DragType) => void;
  handleCreateDragStart: (e: React.MouseEvent, day: Date, columnElement: HTMLDivElement) => void;
  handleLunchDragStart: (e: React.MouseEvent, columnElement: HTMLDivElement, dateStr: string) => void;
  dragRef: React.RefObject<{ hasDragged: boolean }>;
}

export function WeekView({
  currentDate,
  schedules,
  projects,
  member,
  teamMembers,
  workTimeSetting,
  isCreating,
  createDay,
  createStartHour,
  createEndHour,
  isDragging,
  dragScheduleId,
  getLunchTimeForDate,
  lunchDragDate,
  isLunchDragging,
  getDaySchedules,
  getMemberColor,
  openScheduleModal,
  openEditModal,
  setViewingSchedule,
  setContextMenu,
  handleDragStart,
  handleCreateDragStart,
  handleLunchDragStart,
  dragRef,
}: WeekViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 현재 시간으로 스크롤
  useEffect(() => {
    if (timelineRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 1) * HOUR_HEIGHT);
      timelineRef.current.scrollTop = scrollTo;
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 요일 헤더 */}
      <WeekHeader weekDays={weekDays} />

      {/* 타임라인 그리드 */}
      <div ref={timelineRef} className="flex-1 overflow-auto">
        <div className="flex pt-2" style={{ height: TOTAL_HOURS * HOUR_HEIGHT + 16 }}>
          {/* 시간 라벨 */}
          <TimeColumn workTimeSetting={workTimeSetting} />

          {/* 각 요일 컬럼 */}
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const lunchTime = getLunchTimeForDate(dateStr);
            return (
              <DayColumn
                key={dateStr}
                day={day}
                daySchedules={getDaySchedules(day)}
                projects={projects}
                teamMembers={teamMembers}
                member={member}
                workTimeSetting={workTimeSetting}
                isCreating={isCreating}
                createDay={createDay}
                createStartHour={createStartHour}
                createEndHour={createEndHour}
                isDragging={isDragging}
                dragScheduleId={dragScheduleId}
                lunchStartTime={lunchTime.start}
                lunchEndTime={lunchTime.end}
                isLunchDragging={isLunchDragging && lunchDragDate === dateStr}
                getMemberColor={getMemberColor}
                openScheduleModal={openScheduleModal}
                openEditModal={openEditModal}
                setViewingSchedule={setViewingSchedule}
                setContextMenu={setContextMenu}
                handleDragStart={handleDragStart}
                handleCreateDragStart={handleCreateDragStart}
                handleLunchDragStart={handleLunchDragStart}
                dragRef={dragRef}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { WeekHeader } from './WeekHeader';
export { TimeColumn } from './TimeColumn';
export { DayColumn } from './DayColumn';
export { ScheduleBlock } from './ScheduleBlock';
