'use client';

import { Lock } from 'lucide-react';
import type { Schedule, Project, Member } from '@/lib/supabase/database.types';
import type { ColorInfo, SchedulePosition, DragType } from '../../types';
import { TOP_PADDING } from '../../constants';

interface ScheduleBlockProps {
  schedule: Schedule;
  position: SchedulePosition;
  column: number;
  totalColumns: number;
  project: Project | undefined;
  color: ColorInfo & { isCustom: boolean };
  isOwnSchedule: boolean;
  scheduleMember: Member | null | undefined;
  isReadOnly: boolean;
  isBeingDragged: boolean;
  canEdit: boolean;
  isUnclassified: boolean;
  onScheduleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent, scheduleId: string, type: DragType) => void;
  dragRef: React.RefObject<{ hasDragged: boolean }>;
}

export function ScheduleBlock({
  schedule,
  position,
  column,
  totalColumns,
  project,
  color,
  isOwnSchedule,
  scheduleMember,
  isReadOnly,
  isBeingDragged,
  canEdit,
  isUnclassified,
  onScheduleClick,
  onContextMenu,
  onDragStart,
  dragRef,
}: ScheduleBlockProps) {
  // 구글 캘린더 스타일: 겹치는 일정을 살짝 오프셋으로 배치
  const maxOffset = 60;
  const overlapOffset = totalColumns > 1 ? Math.min(15, maxOffset / (totalColumns - 1)) : 0;
  const left = column * overlapOffset;
  const minWidth = Math.max(40, 100 - maxOffset);
  const width = Math.min(100 - left, Math.max(minWidth, 100 - left - (totalColumns - column - 1) * 3));
  const zIndex = 10 + Math.floor((1 / position.height) * 1000);

  return (
    <div
      data-schedule-block
      data-schedule-id={schedule.id}
      className={`absolute rounded-lg ${color.bg || ''} ${color.text} shadow-sm cursor-pointer border-2 border-white ${
        isBeingDragged ? 'opacity-30' : ''
      }`}
      style={{
        top: TOP_PADDING + position.top,
        height: position.height,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        zIndex,
        ...(color.hex ? { backgroundColor: color.hex } : {}),
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (dragRef.current?.hasDragged) return;
        onScheduleClick();
      }}
      onContextMenu={(e) => {
        if (canEdit) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e);
        }
      }}
    >
      {/* 미분류 스케줄 표시 - 빨간 점 */}
      {isUnclassified && (
        <div className="absolute top-1 left-1 z-20">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white shadow-sm" />
        </div>
      )}

      {/* 읽기 전용 표시 - 빗금 패턴 */}
      {isReadOnly && (
        <>
          <div
            className="absolute inset-0 rounded-lg pointer-events-none z-10"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
            }}
          />
          <div className="absolute top-1 right-1 z-20">
            <Lock className="w-3 h-3 opacity-80" />
          </div>
        </>
      )}

      {/* 상단 리사이즈 핸들 */}
      {canEdit && (
        <div
          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black/10 rounded-t-lg"
          onMouseDown={(e) => onDragStart(e, schedule.id, 'resize-top')}
        />
      )}

      {/* 내용 */}
      <div
        className={`p-1.5 h-full overflow-hidden ${canEdit ? 'cursor-move' : ''}`}
        onMouseDown={canEdit ? (e) => onDragStart(e, schedule.id, 'move') : undefined}
        title={`${!isOwnSchedule ? `[${scheduleMember?.name}] ` : ''}${isReadOnly ? '[읽기 전용] ' : ''}${(schedule as any).description || '업무'}\n${(schedule as any).start_time} - ${(schedule as any).end_time}\n${Math.floor(schedule.minutes / 60)}시간 ${schedule.minutes % 60 > 0 ? `${schedule.minutes % 60}분` : ''}\n프로젝트: ${project?.name || '기타'}`}
      >
        {position.height >= 45 ? (
          <>
            <div className="text-xs font-semibold truncate leading-tight">
              {(schedule as any).description || '업무'}
            </div>
            <div className="text-[10px] font-medium opacity-90 leading-tight">
              {(schedule as any).start_time} - {(schedule as any).end_time}
            </div>
            <div className="text-[10px] opacity-75 truncate leading-tight">
              {project?.name || '기타'}
            </div>
          </>
        ) : (
          <div className="text-[10px] font-semibold truncate leading-tight">
            {(schedule as any).description || '업무'}
          </div>
        )}
      </div>

      {/* 하단 리사이즈 핸들 */}
      {canEdit && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 rounded-b-lg"
          onMouseDown={(e) => onDragStart(e, schedule.id, 'resize-bottom')}
        />
      )}
    </div>
  );
}
