'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import type { Schedule, Member, Project } from '@/lib/supabase/database.types';
import { createSchedule, updateSchedule, deleteSchedule, getSchedules } from '@/lib/api';
import type { ScheduleEntry } from '../types';
import { timeToMinutes, minutesToTime } from '../utils/time';

interface UseScheduleModalProps {
  member: Member | null;
  schedules: Schedule[];
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  projects: Project[];
  syncSchedule: (action: string, data: any, projectName?: string) => Promise<void>;
}

export function useScheduleModal({
  member,
  schedules,
  setSchedules,
  projects,
  syncSchedule,
}: UseScheduleModalProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);

  // 시작시간 변경 시 종료시간 자동 계산
  const handleStartTimeChange = useCallback((index: number, startTime: string) => {
    setScheduleEntries(prev => {
      const newEntries = [...prev];
      newEntries[index].startTime = startTime;

      const totalMinutes = parseInt(newEntries[index].hours || '0') * 60 + parseInt(newEntries[index].minutes || '0');
      if (startTime && totalMinutes > 0) {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + totalMinutes;
        newEntries[index].endTime = minutesToTime(endMinutes);
      }

      return newEntries;
    });
  }, []);

  // 종료시간 변경 시 업무시간 자동 계산
  const handleEndTimeChange = useCallback((index: number, endTime: string) => {
    setScheduleEntries(prev => {
      const newEntries = [...prev];
      newEntries[index].endTime = endTime;

      if (newEntries[index].startTime && endTime) {
        const startMinutes = timeToMinutes(newEntries[index].startTime);
        const endMinutes = timeToMinutes(endTime);
        let diff = endMinutes - startMinutes;
        if (diff < 0) diff += 24 * 60;

        const roundedMinutes = Math.round((diff % 60) / 15) * 15;
        const extraHour = roundedMinutes === 60 ? 1 : 0;

        newEntries[index].hours = String(Math.floor(diff / 60) + extraHour);
        newEntries[index].minutes = String(roundedMinutes === 60 ? 0 : roundedMinutes);
      }

      return newEntries;
    });
  }, []);

  // 업무시간 변경 시 종료시간 자동 계산
  const handleDurationChange = useCallback((index: number, field: 'hours' | 'minutes', value: string) => {
    setScheduleEntries(prev => {
      const newEntries = [...prev];
      newEntries[index][field] = value;

      if (newEntries[index].startTime) {
        const totalMinutes = parseInt(newEntries[index].hours || '0') * 60 + parseInt(newEntries[index].minutes || '0');
        const startMinutes = timeToMinutes(newEntries[index].startTime);
        const endMinutes = startMinutes + totalMinutes;
        newEntries[index].endTime = minutesToTime(endMinutes);
      }

      return newEntries;
    });
  }, []);

  // 스케줄 항목 추가
  const addScheduleEntry = useCallback(() => {
    setScheduleEntries(prev => [...prev, {
      projectId: '__none__',
      hours: '1',
      minutes: '0',
      startTime: '',
      endTime: '',
      description: ''
    }]);
  }, []);

  // 스케줄 항목 삭제
  const removeScheduleEntry = useCallback(async (index: number) => {
    const entry = scheduleEntries[index];

    if (entry.scheduleId) {
      try {
        await deleteSchedule(entry.scheduleId);
        setSchedules(prev => prev.filter((s) => s.id !== entry.scheduleId));
      } catch (error) {
        console.error('스케줄 삭제 실패:', error);
        alert('스케줄 삭제에 실패했습니다.');
        return;
      }
    }

    setScheduleEntries(prev => prev.filter((_, i) => i !== index));
  }, [scheduleEntries, setSchedules]);

  // 스케줄 모달 열기
  const openScheduleModal = useCallback((date: Date, hour?: number) => {
    if (!member) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedules = schedules.filter(
      (s) => s.member_id === member.id && s.date === dateStr
    );

    if (hour !== undefined) {
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
      setScheduleEntries([{
        projectId: '__none__',
        hours: '1',
        minutes: '0',
        startTime,
        endTime,
        description: ''
      }]);
    } else if (daySchedules.length > 0) {
      setScheduleEntries(
        daySchedules.map((s) => ({
          projectId: s.project_id || '',
          hours: String(Math.floor(s.minutes / 60)),
          minutes: String(s.minutes % 60),
          startTime: (s as any).start_time || '',
          endTime: (s as any).end_time || '',
          description: (s as any).description || '',
          scheduleId: s.id,
        }))
      );
    } else {
      setScheduleEntries([{
        projectId: '__none__',
        hours: '1',
        minutes: '0',
        startTime: '09:00',
        endTime: '10:00',
        description: ''
      }]);
    }

    setSelectedDate(date);
    setSelectedHour(hour ?? null);
    setEditingSchedule(null);
    setShowScheduleModal(true);
  }, [member, schedules]);

  // 기존 스케줄 수정 모달
  const openEditModal = useCallback((schedule: Schedule, date: Date) => {
    if (!member) return;

    setScheduleEntries([{
      projectId: schedule.project_id,
      hours: String(Math.floor(schedule.minutes / 60)),
      minutes: String(schedule.minutes % 60),
      startTime: (schedule as any).start_time || '',
      endTime: (schedule as any).end_time || '',
      description: (schedule as any).description || '',
      scheduleId: schedule.id,
    }]);

    setSelectedDate(date);
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  }, [member]);

  // 모달 닫기
  const closeModal = useCallback(() => {
    setShowScheduleModal(false);
    setAlertMessage(null);
  }, []);

  // 스케줄 저장
  const saveSchedules = useCallback(async () => {
    if (!member || !selectedDate) return;

    // 프로젝트 미선택 검증
    const unselectedEntries = scheduleEntries.filter(entry => entry.projectId === '__none__');
    if (unselectedEntries.length > 0) {
      setAlertMessage('프로젝트를 선택해주세요.');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // 낙관적 업데이트
    const tempSchedules: Schedule[] = [];
    for (const entry of scheduleEntries) {
      const totalMinutes = parseInt(entry.hours || '0') * 60 + parseInt(entry.minutes || '0');
      if (totalMinutes === 0) continue;

      const projectId = entry.projectId || null;
      const tempId = entry.scheduleId || `temp-${Date.now()}-${Math.random()}`;

      tempSchedules.push({
        id: tempId,
        org_id: member.org_id,
        project_id: projectId,
        member_id: member.id,
        date: dateStr,
        minutes: totalMinutes,
        start_time: entry.startTime || null,
        end_time: entry.endTime || null,
        description: entry.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Schedule);
    }

    // 즉시 UI 업데이트
    setSchedules((prev) => {
      const otherSchedules = prev.filter(
        (s) => !(s.date === dateStr && s.member_id === member.id)
      );
      return [...otherSchedules, ...tempSchedules];
    });
    setShowScheduleModal(false);

    // 백그라운드에서 DB 저장
    try {
      const savePromises = scheduleEntries.map(async (entry) => {
        const totalMinutes = parseInt(entry.hours || '0') * 60 + parseInt(entry.minutes || '0');
        if (totalMinutes === 0) return null;

        const projectId = entry.projectId || null;
        const scheduleData = {
          minutes: totalMinutes,
          start_time: entry.startTime || null,
          end_time: entry.endTime || null,
          description: entry.description || null,
        };

        if (entry.scheduleId) {
          await updateSchedule(entry.scheduleId, {
            ...scheduleData,
            project_id: projectId ?? undefined,
          });
          return entry.scheduleId;
        } else {
          const newSchedule = await createSchedule({
            org_id: member.org_id,
            project_id: projectId,
            member_id: member.id,
            date: dateStr,
            ...scheduleData,
          } as any);
          return newSchedule?.id;
        }
      });

      await Promise.all(savePromises);

      // 실제 데이터로 교체
      const schedulesData = await getSchedules();
      setSchedules(schedulesData);

      // Google Calendar 동기화
      for (const entry of scheduleEntries) {
        if (parseInt(entry.hours || '0') * 60 + parseInt(entry.minutes || '0') === 0) continue;

        const projectId = entry.projectId || null;
        const project = projects.find(p => p.id === projectId);
        const savedSchedule = schedulesData.find((s: any) =>
          s.date === dateStr &&
          s.member_id === member.id &&
          s.start_time === (entry.startTime || null) &&
          s.end_time === (entry.endTime || null)
        ) as any;

        if (savedSchedule) {
          syncSchedule(
            entry.scheduleId ? 'update' : 'create',
            {
              id: savedSchedule.id,
              date: dateStr,
              start_time: entry.startTime,
              end_time: entry.endTime,
              description: entry.description,
              minutes: parseInt(entry.hours || '0') * 60 + parseInt(entry.minutes || '0'),
              project_id: projectId || undefined,
              google_event_id: (savedSchedule as any).google_event_id,
            },
            project?.name
          );
        }
      }
    } catch (error: any) {
      console.error('스케줄 저장 실패:', error);
      alert(`스케줄 저장에 실패했습니다: ${error?.message || '알 수 없는 오류'}`);
      // 실패 시 원래 데이터로 복원
      const schedulesData = await getSchedules();
      setSchedules(schedulesData);
    }
  }, [member, selectedDate, scheduleEntries, projects, setSchedules, syncSchedule]);

  return {
    showScheduleModal,
    setShowScheduleModal,
    selectedDate,
    selectedHour,
    editingSchedule,
    alertMessage,
    setAlertMessage,
    scheduleEntries,
    setScheduleEntries,
    handleStartTimeChange,
    handleEndTimeChange,
    handleDurationChange,
    addScheduleEntry,
    removeScheduleEntry,
    openScheduleModal,
    openEditModal,
    closeModal,
    saveSchedules,
  };
}
