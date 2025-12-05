'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Schedule, Project } from '@/lib/supabase/database.types';
import { updateSchedule, getSchedules } from '@/lib/api';
import { HOUR_HEIGHT, START_HOUR, END_HOUR } from '../constants';
import { timeToMinutes, minutesToTime } from '../utils/time';
import type { DragPreviewState, DragType } from '../types';

interface UseScheduleDragProps {
  schedules: Schedule[];
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  projects: Project[];
  syncSchedule: (action: string, data: any, projectName?: string) => Promise<void>;
}

export function useScheduleDrag({
  schedules,
  setSchedules,
  projects,
  syncSchedule,
}: UseScheduleDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragScheduleId, setDragScheduleId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

  const dragRef = useRef({
    startY: 0,
    startX: 0,
    originalStart: '',
    originalEnd: '',
    originalDate: '',
    hasDragged: false,
    currentStart: '',
    currentEnd: '',
    currentDate: '',
    isDragging: false,
  });

  // 드래그 시작
  const handleDragStart = useCallback((
    e: React.MouseEvent,
    scheduleId: string,
    type: 'move' | 'resize-top' | 'resize-bottom'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    // 읽기 전용 이벤트는 드래그 불가
    if ((schedule as any).is_google_read_only) return;

    const startTime = (schedule as any).start_time || '';
    const endTime = (schedule as any).end_time || '';
    const scheduleDate = schedule.date;

    dragRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      originalStart: startTime,
      originalEnd: endTime,
      originalDate: scheduleDate,
      hasDragged: false,
      currentStart: startTime,
      currentEnd: endTime,
      currentDate: scheduleDate,
      isDragging: true,
    };

    setIsDragging(true);
    setDragScheduleId(scheduleId);
    setDragType(type);
  }, [schedules]);

  // 드래그 했는지 여부 확인 (클릭 vs 드래그 구분용)
  const hasDragged = useCallback(() => {
    return dragRef.current.hasDragged;
  }, []);

  // 드래그 중 처리
  useEffect(() => {
    if (!isDragging || !dragScheduleId || !dragType) return;

    const dayColumns = document.querySelectorAll('[data-day-column]') as NodeListOf<HTMLElement>;
    const TOP_PADDING = 8;

    const columnRects = Array.from(dayColumns).map((col) => ({
      element: col,
      date: col.dataset.dayColumn || '',
      rect: col.getBoundingClientRect(),
    }));

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;

      const { startY, startX, originalStart, originalEnd, originalDate } = dragRef.current;
      const deltaY = e.clientY - startY;
      const deltaX = e.clientX - startX;

      if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
        dragRef.current.hasDragged = true;
      }

      const deltaMinutes = Math.round(deltaY / HOUR_HEIGHT * 60 / 15) * 15;

      const originalStartMinutes = timeToMinutes(originalStart);
      const originalEndMinutes = timeToMinutes(originalEnd);

      let newStartMinutes = originalStartMinutes;
      let newEndMinutes = originalEndMinutes;
      let targetDate = originalDate;

      if (dragType === 'move') {
        newStartMinutes = originalStartMinutes + deltaMinutes;
        newEndMinutes = originalEndMinutes + deltaMinutes;

        const targetColumn = columnRects.find(
          (col) => e.clientX >= col.rect.left && e.clientX <= col.rect.right
        );
        if (targetColumn) {
          targetDate = targetColumn.date;
        }
      } else if (dragType === 'resize-top') {
        newStartMinutes = originalStartMinutes + deltaMinutes;
        if (newStartMinutes >= newEndMinutes - 15) {
          newStartMinutes = newEndMinutes - 15;
        }
      } else if (dragType === 'resize-bottom') {
        newEndMinutes = originalEndMinutes + deltaMinutes;
        if (newEndMinutes <= newStartMinutes + 15) {
          newEndMinutes = newStartMinutes + 15;
        }
      }

      newStartMinutes = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, newStartMinutes));
      newEndMinutes = Math.max(START_HOUR * 60 + 15, Math.min(END_HOUR * 60, newEndMinutes));

      dragRef.current.currentStart = minutesToTime(newStartMinutes);
      dragRef.current.currentEnd = minutesToTime(newEndMinutes);
      dragRef.current.currentDate = targetDate;

      const targetColumn = columnRects.find((col) => col.date === targetDate);
      if (targetColumn) {
        const newTop = targetColumn.rect.top + TOP_PADDING + (newStartMinutes / 60 - START_HOUR) * HOUR_HEIGHT;
        const newHeight = Math.max(30, (newEndMinutes - newStartMinutes) / 60 * HOUR_HEIGHT);

        setDragPreview({
          top: newTop,
          height: newHeight,
          left: targetColumn.rect.left + 2,
          width: targetColumn.rect.width - 4,
          date: targetDate,
          startTime: dragRef.current.currentStart,
          endTime: dragRef.current.currentEnd,
        });
      }
    };

    const handleMouseUp = async () => {
      dragRef.current.isDragging = false;

      const { hasDragged, currentStart, currentEnd, currentDate } = dragRef.current;

      setDragPreview(null);

      if (hasDragged) {
        const newMinutes = timeToMinutes(currentEnd) - timeToMinutes(currentStart);

        setSchedules((prev) =>
          prev.map((s) =>
            s.id === dragScheduleId
              ? {
                  ...s,
                  date: currentDate,
                  start_time: currentStart,
                  end_time: currentEnd,
                  minutes: newMinutes,
                } as any
              : s
          )
        );

        try {
          await updateSchedule(dragScheduleId, {
            date: currentDate,
            minutes: newMinutes,
            start_time: currentStart,
            end_time: currentEnd,
          });

          const updatedSchedule = schedules.find((s) => s.id === dragScheduleId);
          if (updatedSchedule) {
            const project = projects.find((p) => p.id === updatedSchedule.project_id);
            await syncSchedule('update', {
              id: dragScheduleId,
              date: currentDate,
              start_time: currentStart,
              end_time: currentEnd,
              description: (updatedSchedule as any).description,
              minutes: newMinutes,
              project_id: updatedSchedule.project_id || undefined,
              google_event_id: (updatedSchedule as any).google_event_id,
            }, project?.name);
          }
        } catch (error) {
          console.error('스케줄 업데이트 실패:', error);
          const schedulesData = await getSchedules();
          setSchedules(schedulesData);
        }
      }

      setIsDragging(false);
      setDragScheduleId(null);
      setDragType(null);
      setTimeout(() => { dragRef.current.hasDragged = false; }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragScheduleId, dragType, schedules, projects, setSchedules, syncSchedule]);

  return {
    isDragging,
    dragScheduleId,
    dragType,
    dragPreview,
    handleDragStart,
    hasDragged,
  };
}
