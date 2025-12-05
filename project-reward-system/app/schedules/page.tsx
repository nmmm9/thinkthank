'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getProjects, getSchedules, createSchedule, updateSchedule, deleteSchedule, getMembers, updateMember, getWorkTimeSetting, getUnclassifiedSchedules, assignProjectToSchedule, getDailyLunchTimes, updateDailyLunchTime } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import type { Project, Schedule, Member, WorkTimeSetting } from '@/lib/supabase/database.types';

// Components
import { ScheduleSidebar } from './components/ScheduleSidebar';
import { ScheduleHeader } from './components/ScheduleHeader';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { ScheduleModal } from './components/modals/ScheduleModal';
import { AlertModal } from './components/modals/AlertModal';
import { DeleteConfirmModal } from './components/modals/DeleteConfirmModal';
import { ViewingScheduleModal } from './components/modals/ViewingScheduleModal';
import { UnclassifiedModal } from './components/modals/UnclassifiedModal';
import { ContextMenu } from './components/ContextMenu';
import { DragPreview } from './components/DragPreview';

// Utils & Types
import { HOUR_HEIGHT, START_HOUR, END_HOUR, projectColors } from './constants';
import { timeToMinutes, minutesToTime, combineTime, getTimeHour, getTimeMinute } from './utils/time';
import { memberColors, getMemberColorByData, getProjectColorByData } from './utils/colors';
import type { ScheduleEntry, ViewMode, DragPreviewState, ContextMenuState, ViewingScheduleState, ColorInfo, DragType } from './types';

export default function SchedulesPage() {
  const { member } = useAuthStore();

  // 기본 상태
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleProjects, setVisibleProjects] = useState<Record<string, boolean>>({});
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [visibleMembers, setVisibleMembers] = useState<Record<string, boolean>>({});
  const [showMySchedule, setShowMySchedule] = useState(true);
  const [myColor, setMyColor] = useState<string | null>(null);
  const [workTimeSetting, setWorkTimeSetting] = useState<WorkTimeSetting | null>(null);

  // 점심시간 상태 (일별 관리)
  const [defaultLunchStart, setDefaultLunchStart] = useState('12:00');
  const [defaultLunchEnd, setDefaultLunchEnd] = useState('13:00');
  const [dailyLunchTimes, setDailyLunchTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [isLunchDragging, setIsLunchDragging] = useState(false);
  const [lunchDragDate, setLunchDragDate] = useState<string | null>(null);

  // 모달 상태
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ViewingScheduleState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 미분류 스케줄
  const [unclassifiedSchedules, setUnclassifiedSchedules] = useState<Schedule[]>([]);
  const [showUnclassifiedModal, setShowUnclassifiedModal] = useState(false);

  // 스케줄 엔트리 폼
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragScheduleId, setDragScheduleId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-top' | 'resize-bottom' | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

  // 새 스케줄 생성 드래그
  const [isCreating, setIsCreating] = useState(false);
  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [createStartHour, setCreateStartHour] = useState(0);
  const [createEndHour, setCreateEndHour] = useState(0);

  // Refs
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

  const createRef = useRef({
    startY: 0,
    dayColumnTop: 0,
    initialHour: 0,
  });

  const lunchRef = useRef({
    startY: 0,
    dayColumnTop: 0,
    originalStart: '12:00',
    originalEnd: '13:00',
    currentStart: '12:00',
    currentEnd: '13:00',
    dateStr: '',
  });

  // 색상 피커 상태
  const [colorPickerMemberId, setColorPickerMemberId] = useState<string | null>(null);
  const [previewMemberColor, setPreviewMemberColor] = useState<string | null>(null);

  // 데이터 새로고침
  const refreshSchedules = async () => {
    const schedulesData = await getSchedules();
    setSchedules(schedulesData as Schedule[]);
    if (member?.id) {
      const unclassified = await getUnclassifiedSchedules(member.id);
      setUnclassifiedSchedules(unclassified as Schedule[]);
    }
  };

  // Google Calendar 자동 동기화
  const { syncSchedule } = useCalendarSync({
    onSyncComplete: refreshSchedules,
    autoSyncInterval: 5 * 60 * 1000,
  });

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, schedulesData, membersData, workTimeData] = await Promise.all([
          getProjects(),
          getSchedules(),
          getMembers(),
          getWorkTimeSetting(),
        ]);
        setProjects(projectsData as Project[]);
        setSchedules(schedulesData as Schedule[]);
        setWorkTimeSetting(workTimeData as WorkTimeSetting | null);

        // 점심시간 기본값 설정
        if (workTimeData) {
          setDefaultLunchStart((workTimeData as any).lunch_start_time || '12:00');
          setDefaultLunchEnd((workTimeData as any).lunch_end_time || '13:00');
        }
        setVisibleProjects(
          (projectsData as Project[]).reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
        );

        const orgMembers = (membersData as Member[]).filter(
          (m) => m.org_id === member?.org_id && m.id !== member?.id
        );
        setTeamMembers(orgMembers);
        setVisibleMembers(
          orgMembers.reduce((acc, m) => ({ ...acc, [m.id]: false }), {})
        );

        const myMemberData = (membersData as Member[]).find((m) => m.id === member?.id);
        if (myMemberData?.color) {
          setMyColor(myMemberData.color);
        }

        if (member?.id) {
          const unclassified = await getUnclassifiedSchedules(member.id);
          setUnclassifiedSchedules(unclassified as Schedule[]);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [member?.org_id, member?.id]);

  // 주간 변경 시 일별 점심시간 로드
  useEffect(() => {
    const loadDailyLunchTimes = async () => {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      try {
        const data = await getDailyLunchTimes(startStr, endStr);
        const lunchMap: Record<string, { start: string; end: string }> = {};
        data.forEach((item: any) => {
          lunchMap[item.date] = { start: item.start_time, end: item.end_time };
        });
        setDailyLunchTimes(lunchMap);
      } catch (error) {
        console.error('일별 점심시간 로드 실패:', error);
      }
    };

    if (!isLoading) {
      loadDailyLunchTimes();
    }
  }, [currentDate, isLoading]);

  // ESC 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirm) setDeleteConfirm(null);
        else if (contextMenu) setContextMenu(null);
        else if (viewingSchedule) setViewingSchedule(null);
        else if (showScheduleModal) setShowScheduleModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showScheduleModal, viewingSchedule, contextMenu, deleteConfirm]);

  // 컨텍스트 메뉴 외부 클릭
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // 계산된 값들
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 필터링된 프로젝트 (종료일 기준)
  const activeProjects = useMemo(() => {
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      return end >= new Date();
    });
  }, [projects]);

  const myActiveProjects = useMemo(() => {
    if (!member) return [];
    return activeProjects.filter((p) => {
      const allocations = (p as any).allocations || [];
      return allocations.some((a: any) => a.member_id === member.id);
    });
  }, [activeProjects, member]);

  const completedProjects = useMemo(() => {
    if (!member) return [];
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      if (end >= new Date()) return false;
      const allocations = (p as any).allocations || [];
      return allocations.some((a: any) => a.member_id === member.id);
    });
  }, [projects, member]);

  // 이번 주 스케줄
  const weekSchedules = useMemo(() => {
    const weekDateStrs = weekDays.map(d => format(d, 'yyyy-MM-dd'));
    return schedules.filter(s => weekDateStrs.includes(s.date));
  }, [schedules, weekDays]);

  // 색상 함수
  const getMemberColor = (memberId: string): ColorInfo & { isCustom: boolean } => {
    return getMemberColorByData(
      memberId,
      member?.id,
      myColor,
      teamMembers,
      colorPickerMemberId,
      previewMemberColor
    );
  };

  const getProjectColor = (projectId: string | null): ColorInfo & { isCustom?: boolean } => {
    return getProjectColorByData(projectId, projects);
  };

  // 해당 날짜의 스케줄 가져오기
  const getDaySchedules = (date: Date, includeOthers = true): Schedule[] => {
    if (!member) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter((s) => {
      if (s.date !== dateStr) return false;

      // 본인 스케줄
      if (s.member_id === member.id) {
        if (!showMySchedule) return false;
        // 기타 스케줄 (project_id가 없는 경우) - 항상 표시
        if (!s.project_id) return true;
        // 프로젝트 가시성 체크
        return visibleProjects[s.project_id] !== false;
      }

      // 다른 팀원 스케줄
      if (!includeOthers) return false;
      return visibleMembers[s.member_id];
    });
  };

  // 멤버 색상 변경
  const handleMemberColorChange = async (memberId: string, color: string) => {
    try {
      await updateMember(memberId, { color });
      if (memberId === member?.id) {
        setMyColor(color);
      } else {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, color } : m))
        );
      }
      setColorPickerMemberId(null);
      setPreviewMemberColor(null);
    } catch (error) {
      console.error('색상 변경 실패:', error);
    }
  };

  // 멤버 가시성 토글
  const toggleMemberVisibility = (memberId: string) => {
    setVisibleMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // 스케줄 모달 열기
  const openScheduleModal = (date: Date, hour?: number) => {
    if (!member) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedules = schedules.filter(
      (s) => s.member_id === member.id && s.date === dateStr
    );

    if (hour !== undefined) {
      // 특정 시간대 클릭 시 해당 시간으로 시작
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
      setScheduleEntries([{
        projectId: '__none__',
        hours: '1',
        minutes: '0',
        startTime,
        endTime,
        description: '',
      }]);
    } else if (daySchedules.length > 0) {
      // 기존 스케줄이 있으면 불러오기
      setScheduleEntries(
        daySchedules.map((s) => ({
          scheduleId: s.id,
          projectId: s.project_id || '',
          hours: String(Math.floor(s.minutes / 60)),
          minutes: String(s.minutes % 60),
          startTime: (s as any).start_time || '',
          endTime: (s as any).end_time || '',
          description: (s as any).description || '',
        }))
      );
    } else {
      // 없으면 빈 항목 하나 (기본 9시 시작)
      setScheduleEntries([{
        projectId: '__none__',
        hours: '1',
        minutes: '0',
        startTime: '09:00',
        endTime: '10:00',
        description: '',
      }]);
    }

    setSelectedDate(date);
    setSelectedHour(hour ?? null);
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  // 수정 모달 열기
  const openEditModal = (schedule: Schedule, date: Date) => {
    if (!member) return;
    setSelectedDate(date);
    setEditingSchedule(schedule);

    const startTime = (schedule as any).start_time || '09:00';
    const endTime = (schedule as any).end_time || '10:00';
    const hours = Math.floor(schedule.minutes / 60);
    const mins = schedule.minutes % 60;

    setScheduleEntries([{
      projectId: schedule.project_id || '',
      hours: String(hours),
      minutes: String(mins),
      startTime,
      endTime,
      description: (schedule as any).description || '',
      scheduleId: schedule.id,
    }]);
    setShowScheduleModal(true);
  };

  // 스케줄 엔트리 추가
  const addScheduleEntry = () => {
    const lastEntry = scheduleEntries[scheduleEntries.length - 1];
    const newStartTime = lastEntry?.endTime || '09:00';
    const [h] = newStartTime.split(':').map(Number);
    const newEndTime = `${String(h + 1).padStart(2, '0')}:00`;

    setScheduleEntries([
      ...scheduleEntries,
      {
        projectId: '__none__',
        hours: '1',
        minutes: '0',
        startTime: newStartTime,
        endTime: newEndTime,
        description: '',
      },
    ]);
  };

  // 스케줄 엔트리 삭제
  const removeScheduleEntry = async (index: number) => {
    const entry = scheduleEntries[index];

    // DB에 저장된 스케줄이면 삭제
    if (entry.scheduleId) {
      try {
        await deleteSchedule(entry.scheduleId);
        setSchedules((prev) => prev.filter((s) => s.id !== entry.scheduleId));
      } catch (error) {
        console.error('스케줄 삭제 실패:', error);
        setAlertMessage('스케줄 삭제에 실패했습니다.');
        return;
      }
    }

    setScheduleEntries(scheduleEntries.filter((_, i) => i !== index));
  };

  // 스케줄 엔트리 업데이트
  const updateScheduleEntry = (index: number, updates: Partial<ScheduleEntry>) => {
    setScheduleEntries((prev) => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], ...updates };
      return newEntries;
    });
  };

  // 스케줄 저장
  const saveSchedules = async () => {
    if (!selectedDate || !member?.id) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // 검증
    for (const entry of scheduleEntries) {
      if (entry.projectId === '__none__') {
        setAlertMessage('프로젝트를 선택해주세요.');
        return;
      }
      const totalMinutes = (parseInt(entry.hours || '0') * 60) + parseInt(entry.minutes || '0');
      if (totalMinutes <= 0) {
        setAlertMessage('업무 시간을 입력해주세요.');
        return;
      }
    }

    try {
      // DB 저장
      for (const entry of scheduleEntries) {
        const totalMinutes = (parseInt(entry.hours || '0') * 60) + parseInt(entry.minutes || '0');
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
        } else {
          await createSchedule({
            org_id: member.org_id,
            project_id: projectId,
            member_id: member.id,
            date: dateStr,
            ...scheduleData,
          } as any);
        }
      }

      // 실제 데이터 갱신
      const schedulesData = await getSchedules();
      setSchedules(schedulesData as Schedule[]);

      // Google Calendar 동기화
      for (const entry of scheduleEntries) {
        const totalMinutes = (parseInt(entry.hours || '0') * 60) + parseInt(entry.minutes || '0');
        if (totalMinutes === 0) continue;

        const projectId = entry.projectId || null;
        const project = projects.find((p) => p.id === projectId);
        const savedSchedule = schedulesData.find(
          (s: any) =>
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
              minutes: totalMinutes,
              project_id: projectId || undefined,
              google_event_id: savedSchedule.google_event_id,
            },
            project?.name
          );
        }
      }

      setShowScheduleModal(false);
    } catch (error: any) {
      console.error('스케줄 저장 실패:', error);
      setAlertMessage('스케줄 저장에 실패했습니다.');
    }
  };

  // 스케줄 삭제
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const scheduleToDelete = schedules.find((s) => s.id === scheduleId);
      await deleteSchedule(scheduleId);
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setDeleteConfirm(null);
      setContextMenu(null);

      if (scheduleToDelete) {
        await syncSchedule('delete', {
          id: scheduleId,
          date: scheduleToDelete.date,
          minutes: scheduleToDelete.minutes,
          google_event_id: (scheduleToDelete as any).google_event_id,
        });
      }
    } catch (error) {
      console.error('스케줄 삭제 실패:', error);
      setAlertMessage('스케줄 삭제에 실패했습니다.');
    }
  };

  // 프로젝트 지정 (미분류)
  const handleAssignProject = async (scheduleId: string, projectId: string) => {
    try {
      await assignProjectToSchedule(scheduleId, projectId);
      setUnclassifiedSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      await refreshSchedules();
    } catch (error) {
      console.error('프로젝트 지정 실패:', error);
    }
  };

  // 드래그 시작 (기존 스케줄)
  const handleDragStart = (e: React.MouseEvent, scheduleId: string, type: DragType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!type) return;
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    // 읽기 전용 이벤트는 드래그 불가
    if ((schedule as any).is_google_read_only) return;

    const startTime = (schedule as any).start_time || '09:00';
    const endTime = (schedule as any).end_time || '10:00';

    dragRef.current = {
      startY: e.clientY,
      startX: e.clientX,
      originalStart: startTime,
      originalEnd: endTime,
      originalDate: schedule.date,
      hasDragged: false,
      currentStart: startTime,
      currentEnd: endTime,
      currentDate: schedule.date,
      isDragging: true,
    };

    setIsDragging(true);
    setDragScheduleId(scheduleId);
    setDragType(type);
  };

  // 드래그 중 (useEffect로 이벤트 리스너 관리)
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
              ? { ...s, date: currentDate, start_time: currentStart, end_time: currentEnd, minutes: newMinutes } as any
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

          // Google Calendar 동기화
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
          await refreshSchedules();
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
  }, [isDragging, dragScheduleId, dragType]);

  // 새 스케줄 생성 드래그 시작
  const handleCreateDragStart = (e: React.MouseEvent, day: Date, columnElement: HTMLDivElement) => {
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
  };

  // 새 스케줄 생성 드래그 중 (useEffect로 이벤트 리스너 관리)
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

        setScheduleEntries([{
          projectId: '__none__',
          hours: String(duration),
          minutes: '0',
          startTime,
          endTime,
          description: '',
        }]);

        setSelectedDate(createDay);
        setSelectedHour(currentStartHour);
        setEditingSchedule(null);
        setShowScheduleModal(true);
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
  }, [isCreating, createDay]);

  // 특정 날짜의 점심시간 가져오기
  const getLunchTimeForDate = (dateStr: string) => {
    if (dailyLunchTimes[dateStr]) {
      return dailyLunchTimes[dateStr];
    }
    return { start: defaultLunchStart, end: defaultLunchEnd };
  };

  // 점심시간 드래그 시작
  const handleLunchDragStart = (e: React.MouseEvent, columnElement: HTMLDivElement, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = columnElement.getBoundingClientRect();
    const TOP_PADDING = 8;
    const lunchTime = getLunchTimeForDate(dateStr);

    lunchRef.current = {
      startY: e.clientY,
      dayColumnTop: rect.top + TOP_PADDING,
      originalStart: lunchTime.start,
      originalEnd: lunchTime.end,
      currentStart: lunchTime.start,
      currentEnd: lunchTime.end,
      dateStr: dateStr,
    };

    setIsLunchDragging(true);
    setLunchDragDate(dateStr);
  };

  // 점심시간 드래그 중 (useEffect로 이벤트 리스너 관리)
  useEffect(() => {
    if (!isLunchDragging || !lunchDragDate) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { startY, originalStart, originalEnd, dateStr } = lunchRef.current;
      const deltaY = e.clientY - startY;
      const deltaMinutes = Math.round(deltaY / HOUR_HEIGHT * 60 / 15) * 15;

      const originalStartMinutes = timeToMinutes(originalStart);
      const originalEndMinutes = timeToMinutes(originalEnd);
      const duration = originalEndMinutes - originalStartMinutes;

      let newStartMinutes = originalStartMinutes + deltaMinutes;
      let newEndMinutes = newStartMinutes + duration;

      // 범위 제한
      if (newStartMinutes < START_HOUR * 60) {
        newStartMinutes = START_HOUR * 60;
        newEndMinutes = newStartMinutes + duration;
      }
      if (newEndMinutes > END_HOUR * 60) {
        newEndMinutes = END_HOUR * 60;
        newStartMinutes = newEndMinutes - duration;
      }

      const newStart = minutesToTime(newStartMinutes);
      const newEnd = minutesToTime(newEndMinutes);

      lunchRef.current.currentStart = newStart;
      lunchRef.current.currentEnd = newEnd;

      // 해당 날짜만 업데이트
      setDailyLunchTimes(prev => ({
        ...prev,
        [dateStr]: { start: newStart, end: newEnd }
      }));
    };

    const handleMouseUp = async () => {
      const { currentStart, currentEnd, dateStr } = lunchRef.current;
      setIsLunchDragging(false);
      setLunchDragDate(null);

      // DB에 저장
      if (member?.org_id && dateStr) {
        try {
          await updateDailyLunchTime(member.org_id, dateStr, currentStart, currentEnd);
        } catch (error) {
          console.error('점심시간 저장 실패:', error);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLunchDragging, lunchDragDate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 왼쪽 사이드바 */}
      <ScheduleSidebar
        member={member}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        myActiveProjects={myActiveProjects}
        completedProjects={completedProjects}
        allProjects={projects}
        getDaySchedules={getDaySchedules}
        weekSchedules={weekSchedules}
        workTimeSetting={workTimeSetting}
        getLunchHoursForDate={getLunchTimeForDate}
        teamMembers={teamMembers}
        showMySchedule={showMySchedule}
        visibleMembers={visibleMembers}
        getMemberColor={getMemberColor}
        setShowMySchedule={setShowMySchedule}
        toggleMemberVisibility={toggleMemberVisibility}
        onMemberColorChange={handleMemberColorChange}
        onSyncComplete={refreshSchedules}
      />

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <ScheduleHeader
          currentDate={currentDate}
          viewMode={viewMode}
          unclassifiedCount={unclassifiedSchedules.length}
          setCurrentDate={setCurrentDate}
          setViewMode={setViewMode}
          onShowUnclassifiedModal={() => setShowUnclassifiedModal(true)}
        />

        {/* 컨텐츠 */}
        {viewMode === 'week' ? (
          <WeekView
            currentDate={currentDate}
            schedules={schedules}
            projects={projects}
            member={member}
            teamMembers={teamMembers}
            workTimeSetting={workTimeSetting}
            isCreating={isCreating}
            createDay={createDay}
            createStartHour={createStartHour}
            createEndHour={createEndHour}
            isDragging={isDragging}
            dragScheduleId={dragScheduleId}
            getLunchTimeForDate={getLunchTimeForDate}
            lunchDragDate={lunchDragDate}
            isLunchDragging={isLunchDragging}
            getDaySchedules={getDaySchedules}
            getMemberColor={getMemberColor}
            openScheduleModal={openScheduleModal}
            openEditModal={openEditModal}
            setViewingSchedule={setViewingSchedule}
            setContextMenu={setContextMenu}
            handleDragStart={handleDragStart}
            handleCreateDragStart={handleCreateDragStart}
            handleLunchDragStart={handleLunchDragStart}
            dragRef={dragRef as any}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            activeProjects={activeProjects}
            visibleProjects={visibleProjects}
            member={member}
            teamMembers={teamMembers}
            getDaySchedules={getDaySchedules}
            getProjectColor={getProjectColor}
            getMemberColor={getMemberColor}
            openScheduleModal={openScheduleModal}
            projects={projects}
          />
        )}
      </div>

      {/* 스케줄 추가/수정 모달 */}
      <ScheduleModal
        isOpen={showScheduleModal}
        selectedDate={selectedDate}
        editingSchedule={editingSchedule}
        scheduleEntries={scheduleEntries}
        myActiveProjects={myActiveProjects}
        onClose={() => setShowScheduleModal(false)}
        onSave={saveSchedules}
        onAddEntry={addScheduleEntry}
        onRemoveEntry={removeScheduleEntry}
        onUpdateEntry={updateScheduleEntry}
      />

      {/* 드래그 프리뷰 */}
      <DragPreview
        dragPreview={dragPreview}
        dragScheduleId={dragScheduleId}
        schedules={schedules}
        projects={projects}
      />

      {/* 알림 모달 */}
      <AlertModal
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
      />

      {/* 팀원 스케줄 보기 모달 */}
      <ViewingScheduleModal
        data={viewingSchedule}
        onClose={() => setViewingSchedule(null)}
        getMemberColor={getMemberColor}
      />

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          data={contextMenu}
          onDelete={(id) => setDeleteConfirm(id)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        scheduleId={deleteConfirm}
        onConfirm={handleDeleteSchedule}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* 미분류 스케줄 모달 */}
      <UnclassifiedModal
        isOpen={showUnclassifiedModal}
        schedules={unclassifiedSchedules}
        myActiveProjects={myActiveProjects}
        onClose={() => setShowUnclassifiedModal(false)}
        onAssignProject={handleAssignProject}
      />
    </div>
  );
}
