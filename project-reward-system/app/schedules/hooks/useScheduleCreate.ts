'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HOUR_HEIGHT, START_HOUR, END_HOUR } from '../constants';
import type { ScheduleEntry } from '../types';

interface UseScheduleCreateProps {
  onComplete: (
    day: Date,
    startHour: number,
    endHour: number,
    entry: ScheduleEntry
  ) => void;
}

export function useScheduleCreate({ onComplete }: UseScheduleCreateProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [createStartHour, setCreateStartHour] = useState(0);
  const [createEndHour, setCreateEndHour] = useState(0);

  const createRef = useRef({
    startY: 0,
    dayColumnTop: 0,
    initialHour: 0,
  });

  // 드래그 시작
  const handleCreateDragStart = useCallback((
    e: React.MouseEvent,
    day: Date,
    columnElement: HTMLDivElement
  ) => {
    e.preventDefault();
    const rect = columnElement.getBoundingClientRect();
    const TOP_PADDING = 8;
    const y = e.clientY - rect.top - TOP_PADDING;
    const hour = Math.floor(y / HOUR_HEIGHT) + START_HOUR;
    const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR - 1, hour));

    createRef.current = {
      startY: e.clientY,
      dayColumnTop: rect.top + TOP_PADDING,
      initialHour: clampedHour,
    };

    setIsCreating(true);
    setCreateDay(day);
    setCreateStartHour(clampedHour);
    setCreateEndHour(clampedHour + 1);
  }, []);

  // 드래그 중 및 완료 처리
  useEffect(() => {
    if (!isCreating || !createDay) return;

    let currentStartHour = createStartHour;
    let currentEndHour = createEndHour;

    const handleMouseMove = (e: MouseEvent) => {
      const { dayColumnTop, initialHour } = createRef.current;
      const y = e.clientY - dayColumnTop;
      const hour = Math.floor(y / HOUR_HEIGHT) + START_HOUR;
      const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR, hour));

      if (clampedHour >= initialHour) {
        currentStartHour = initialHour;
        currentEndHour = Math.max(initialHour + 1, clampedHour + 1);
      } else {
        currentStartHour = clampedHour;
        currentEndHour = initialHour + 1;
      }

      setCreateStartHour(currentStartHour);
      setCreateEndHour(Math.min(END_HOUR, currentEndHour));
    };

    const handleMouseUp = () => {
      if (createDay && currentEndHour > currentStartHour) {
        const startTime = `${String(currentStartHour).padStart(2, '0')}:00`;
        const endTime = `${String(currentEndHour).padStart(2, '0')}:00`;
        const duration = currentEndHour - currentStartHour;

        onComplete(createDay, currentStartHour, currentEndHour, {
          projectId: '__none__',
          hours: String(duration),
          minutes: '0',
          startTime,
          endTime,
          description: ''
        });
      }

      setIsCreating(false);
      setCreateDay(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCreating, createDay, createStartHour, createEndHour, onComplete]);

  return {
    isCreating,
    createDay,
    createStartHour,
    createEndHour,
    handleCreateDragStart,
  };
}
