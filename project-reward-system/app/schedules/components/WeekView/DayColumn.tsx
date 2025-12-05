'use client';

import { format, isToday } from 'date-fns';
import { HOUR_HEIGHT, START_HOUR, END_HOUR, TOTAL_HOURS, TOP_PADDING } from '../../constants';
import { getSchedulePosition, getOverlappingSchedules } from '../../utils/position';
import { isWorkingDay } from '@/lib/utils/workdays';
import { ScheduleBlock } from './ScheduleBlock';
import type { Schedule, Project, Member, WorkTimeSetting } from '@/lib/supabase/database.types';
import type { ColorInfo, DragType } from '../../types';

interface DayColumnProps {
  day: Date;
  daySchedules: Schedule[];
  projects: Project[];
  teamMembers: Member[];
  member: Member | null;
  workTimeSetting: WorkTimeSetting | null;
  isCreating: boolean;
  createDay: Date | null;
  createStartHour: number;
  createEndHour: number;
  isDragging: boolean;
  dragScheduleId: string | null;
  lunchStartTime: string;
  lunchEndTime: string;
  isLunchDragging: boolean;
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  openScheduleModal: (date: Date, hour?: number) => void;
  openEditModal: (schedule: Schedule, date: Date) => void;
  setViewingSchedule: (data: { schedule: Schedule; member: Member; project: Project | null } | null) => void;
  setContextMenu: (data: { x: number; y: number; scheduleId: string } | null) => void;
  handleDragStart: (e: React.MouseEvent, scheduleId: string, type: DragType) => void;
  handleCreateDragStart: (e: React.MouseEvent, day: Date, columnElement: HTMLDivElement) => void;
  handleLunchDragStart: (e: React.MouseEvent, columnElement: HTMLDivElement, dateStr: string) => void;
  dragRef: React.RefObject<{ hasDragged: boolean }>;
}

export function DayColumn({
  day,
  daySchedules,
  projects,
  teamMembers,
  member,
  workTimeSetting,
  isCreating,
  createDay,
  createStartHour,
  createEndHour,
  isDragging,
  dragScheduleId,
  lunchStartTime,
  lunchEndTime,
  isLunchDragging,
  getMemberColor,
  openScheduleModal,
  openEditModal,
  setViewingSchedule,
  setContextMenu,
  handleDragStart,
  handleCreateDragStart,
  handleLunchDragStart,
  dragRef,
}: DayColumnProps) {
  const positionedSchedules = getOverlappingSchedules(daySchedules);
  const isCreatingOnThisDay = isCreating && createDay && format(createDay, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
  const isNonWorkingDay = !isWorkingDay(day);

  // 업무시간 계산
  const workStart = workTimeSetting?.work_start_time || '09:30';
  const workEnd = workTimeSetting?.work_end_time || '18:30';
  const [startH, startM] = workStart.split(':').map(Number);
  const [endH, endM] = workEnd.split(':').map(Number);
  const workStartHour = startH + startM / 60;
  const workEndHour = endH + endM / 60;

  const beforeTop = TOP_PADDING;
  const beforeHeight = Math.max(0, (workStartHour - START_HOUR) * HOUR_HEIGHT);
  const afterTop = TOP_PADDING + (workEndHour - START_HOUR) * HOUR_HEIGHT;
  const afterHeight = Math.max(0, (END_HOUR - workEndHour) * HOUR_HEIGHT);
  const startLineTop = TOP_PADDING + (workStartHour - START_HOUR) * HOUR_HEIGHT;
  const endLineTop = TOP_PADDING + (workEndHour - START_HOUR) * HOUR_HEIGHT;

  return (
    <div
      key={format(day, 'yyyy-MM-dd')}
      data-day-column={format(day, 'yyyy-MM-dd')}
      className={`flex-1 relative border-l border-gray-200 ${isNonWorkingDay ? 'bg-gray-50' : ''}`}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-schedule-block]')) return;
        handleCreateDragStart(e, day, e.currentTarget as HTMLDivElement);
      }}
    >
      {/* 주말/공휴일 전체 배경 */}
      {isNonWorkingDay && (
        <div
          className="absolute inset-0 bg-gray-200 opacity-30 pointer-events-none"
          style={{ zIndex: 1 }}
        />
      )}

      {/* 업무시간 외 영역 표시 */}
      {beforeHeight > 0 && (
        <div
          className="absolute w-full bg-gray-100 pointer-events-none opacity-40"
          style={{ top: beforeTop, height: beforeHeight }}
        />
      )}
      {afterHeight > 0 && (
        <div
          className="absolute w-full bg-gray-100 pointer-events-none opacity-40"
          style={{ top: afterTop, height: afterHeight }}
        />
      )}

      {/* 업무시간 경계선 (파란 점선) */}
      <div
        className="absolute w-full pointer-events-none z-10"
        style={{ top: startLineTop, borderTop: '2px dashed #3b82f6' }}
      />
      <div
        className="absolute w-full pointer-events-none z-10"
        style={{ top: endLineTop, borderTop: '2px dashed #3b82f6' }}
      />

      {/* 시간 그리드 라인 */}
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={i}
          className="absolute w-full border-t border-gray-100 cursor-crosshair hover:bg-blue-50 transition-colors"
          style={{ top: TOP_PADDING + i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          onClick={(e) => {
            if (!isCreating) {
              openScheduleModal(day, START_HOUR + i);
            }
          }}
        />
      ))}

      {/* 점심시간 블록 (주말/공휴일 제외, 항상 맨 앞에 표시) */}
      {!isNonWorkingDay && (() => {
        const [lunchStartH, lunchStartM] = lunchStartTime.split(':').map(Number);
        const [lunchEndH, lunchEndM] = lunchEndTime.split(':').map(Number);
        const lunchStartHour = lunchStartH + lunchStartM / 60;
        const lunchEndHour = lunchEndH + lunchEndM / 60;
        const lunchTop = TOP_PADDING + (lunchStartHour - START_HOUR) * HOUR_HEIGHT;
        const lunchHeight = (lunchEndHour - lunchStartHour) * HOUR_HEIGHT;
        const dateStr = format(day, 'yyyy-MM-dd');

        return (
          <div
            data-lunch-block
            className={`absolute left-1 right-1 bg-amber-100 border-2 border-amber-400 rounded-lg cursor-move select-none ${
              isLunchDragging ? 'opacity-50' : ''
            }`}
            style={{ top: lunchTop, height: lunchHeight, zIndex: 50 }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLunchDragStart(e, e.currentTarget.parentElement as HTMLDivElement, dateStr);
            }}
          >
            <div className="p-1.5 h-full flex flex-col justify-center items-center pointer-events-none">
              <span className="text-xs font-medium text-amber-700">🍽️ 점심</span>
              <span className="text-[10px] text-amber-600">
                {lunchStartTime} - {lunchEndTime}
              </span>
            </div>
          </div>
        );
      })()}

      {/* 새 스케줄 생성 프리뷰 */}
      {isCreatingOnThisDay && (
        <div
          className="absolute left-1 right-1 bg-blue-400 opacity-50 rounded-lg pointer-events-none z-20"
          style={{
            top: TOP_PADDING + (createStartHour - START_HOUR) * HOUR_HEIGHT,
            height: (createEndHour - createStartHour) * HOUR_HEIGHT,
          }}
        >
          <div className="p-2 text-white text-sm font-medium">
            {`${String(createStartHour).padStart(2, '0')}:00 - ${String(createEndHour).padStart(2, '0')}:00`}
          </div>
        </div>
      )}

      {/* 현재 시간 표시 (항상 맨 앞에 표시) */}
      {isToday(day) && (
        <div
          className="absolute w-full border-t-2 border-red-500 pointer-events-none"
          style={{
            top: TOP_PADDING + ((new Date().getHours() + new Date().getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT,
            zIndex: 99999,
          }}
        >
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full -mt-1.5 -ml-1" />
        </div>
      )}

      {/* 스케줄 블록들 */}
      {positionedSchedules.map(({ schedule, column, totalColumns }) => {
        const pos = getSchedulePosition(schedule);
        const project = projects.find((p) => p.id === schedule.project_id);
        const isOwnSchedule = schedule.member_id === member?.id;
        const scheduleMember = !isOwnSchedule ? teamMembers.find((m) => m.id === schedule.member_id) : null;
        const isReadOnly = (schedule as any).is_google_read_only === true;
        const canEdit = isOwnSchedule && !isReadOnly;
        const isUnclassified = isOwnSchedule && !schedule.project_id;
        const color = getMemberColor(schedule.member_id);
        const isBeingDragged = isDragging && dragScheduleId === schedule.id;

        return (
          <ScheduleBlock
            key={schedule.id}
            schedule={schedule}
            position={pos}
            column={column}
            totalColumns={totalColumns}
            project={project}
            color={color}
            isOwnSchedule={isOwnSchedule}
            scheduleMember={scheduleMember}
            isReadOnly={isReadOnly}
            isBeingDragged={isBeingDragged}
            canEdit={canEdit}
            isUnclassified={isUnclassified}
            onScheduleClick={() => {
              if (isOwnSchedule && !isReadOnly) {
                openEditModal(schedule, day);
              } else if (isReadOnly) {
                setViewingSchedule({
                  schedule,
                  member: teamMembers.find((m) => m.id === schedule.member_id) || (member as any),
                  project: project || null,
                });
              } else if (scheduleMember) {
                setViewingSchedule({
                  schedule,
                  member: scheduleMember,
                  project: project || null,
                });
              }
            }}
            onContextMenu={(e) => {
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                scheduleId: schedule.id,
              });
            }}
            onDragStart={handleDragStart}
            dragRef={dragRef}
          />
        );
      })}
    </div>
  );
}
