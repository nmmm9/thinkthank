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

  // 종일 이벤트와 시간 이벤트 분리
  const getTimedSchedules = (date: Date) => {
    return getDaySchedules(date).filter((s) => s.start_time !== null);
  };

  const getAllDaySchedules = (date: Date) => {
    return getDaySchedules(date).filter((s) => s.start_time === null);
  };

  // 이번 주에 종일 이벤트가 있는지 확인
  const hasAnyAllDayEvents = weekDays.some((day) => getAllDaySchedules(day).length > 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 요일 헤더 */}
      <WeekHeader weekDays={weekDays} />

      {/* 종일 이벤트 행 (종일 이벤트가 있을 때만 표시) */}
      {hasAnyAllDayEvents && (
        <div className="flex border-b border-gray-200 bg-gray-50">
          {/* 시간 라벨 영역 (빈 공간) */}
          <div className="w-16 flex-shrink-0 px-2 py-1 text-xs text-gray-500 text-right">
            종일
          </div>
          {/* 각 요일의 종일 이벤트 */}
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const allDayEvents = getAllDaySchedules(day);
            return (
              <div
                key={`allday-${dateStr}`}
                className="flex-1 border-l border-gray-200 px-1 py-1 min-h-[28px] flex flex-wrap gap-1"
              >
                {allDayEvents.map((schedule) => {
                  const project = projects.find((p) => p.id === schedule.project_id);
                  const color = getMemberColor(schedule.member_id);
                  return (
                    <div
                      key={schedule.id}
                      className="text-xs px-2 py-0.5 rounded truncate max-w-full cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                        border: `1px solid ${color.hex}`,
                      }}
                      title={schedule.description || '종일 이벤트'}
                      onClick={() => {
                        const scheduleMember = teamMembers.find((m) => m.id === schedule.member_id);
                        if (scheduleMember) {
                          setViewingSchedule({
                            schedule,
                            member: scheduleMember,
                            project: project || null,
                          });
                        }
                      }}
                    >
                      {schedule.description || '(제목 없음)'}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* 타임라인 그리드 */}
      <div ref={timelineRef} className="flex-1 overflow-auto">
        <div className="flex pt-2" style={{ height: TOTAL_HOURS * HOUR_HEIGHT + 16 }}>
          {/* 시간 라벨 */}
          <TimeColumn workTimeSetting={workTimeSetting} />

          {/* 각 요일 컬럼 (시간 이벤트만) */}
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const lunchTime = getLunchTimeForDate(dateStr);
            return (
              <DayColumn
                key={dateStr}
                day={day}
                daySchedules={getTimedSchedules(day)}
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
