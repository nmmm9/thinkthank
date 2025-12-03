'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { getProjects, getSchedules, createSchedule, updateSchedule, deleteSchedule, updateProject } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Project, Schedule } from '@/lib/supabase/database.types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addDays,
  startOfWeek,
  isSameMonth,
  differenceInDays,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Plus, X, Trash2, Palette } from 'lucide-react';

// 타임라인 설정
const HOUR_HEIGHT = 60; // 1시간 = 60px
const START_HOUR = 6; // 시작 시간 (오전 6시)
const END_HOUR = 22; // 종료 시간 (오후 10시)
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function SchedulesPage() {
  const { member } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleProjects, setVisibleProjects] = useState<Record<string, boolean>>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<Array<{
    projectId: string;
    hours: string;
    minutes: string;
    startTime: string;
    endTime: string;
    description: string;
    scheduleId?: string
  }>>([]);

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragScheduleId, setDragScheduleId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-top' | 'resize-bottom' | null>(null);

  // 드래그 프리뷰 상태 (React로 관리)
  const [dragPreview, setDragPreview] = useState<{
    top: number;
    height: number;
    left: number;
    width: number;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // ref로 관리하여 리렌더링 방지
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
  });

  // 새 스케줄 생성용 드래그 상태
  const [isCreating, setIsCreating] = useState(false);
  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [createStartHour, setCreateStartHour] = useState(0);
  const [createEndHour, setCreateEndHour] = useState(0);
  const createRef = useRef({
    startY: 0,
    dayColumnTop: 0,
    initialHour: 0,
  });

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, schedulesData] = await Promise.all([
          getProjects(),
          getSchedules(),
        ]);
        setProjects(projectsData as Project[]);
        setSchedules(schedulesData as Schedule[]);
        setVisibleProjects(
          (projectsData as Project[]).reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
        );
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 현재 시간으로 스크롤
  useEffect(() => {
    if (timelineRef.current && viewMode === 'week') {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollTo = Math.max(0, (currentHour - START_HOUR - 1) * HOUR_HEIGHT);
      timelineRef.current.scrollTop = scrollTo;
    }
  }, [viewMode, isLoading]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 프로젝트 색상 배정 (더 선명한 색상)
  const projectColors = [
    { key: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', light: 'bg-blue-100', hex: '#3b82f6' },
    { key: 'green', bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', light: 'bg-green-100', hex: '#22c55e' },
    { key: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-white', light: 'bg-purple-100', hex: '#a855f7' },
    { key: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-white', light: 'bg-orange-100', hex: '#f97316' },
    { key: 'pink', bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-white', light: 'bg-pink-100', hex: '#ec4899' },
    { key: 'teal', bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-white', light: 'bg-teal-100', hex: '#14b8a6' },
    { key: 'indigo', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-white', light: 'bg-indigo-100', hex: '#6366f1' },
    { key: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', light: 'bg-red-100', hex: '#ef4444' },
    { key: 'yellow', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-white', light: 'bg-yellow-100', hex: '#eab308' },
    { key: 'cyan', bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', text: 'text-white', light: 'bg-cyan-100', hex: '#06b6d4' },
  ];

  // 색상 선택 팝오버 상태
  const [colorPickerProjectId, setColorPickerProjectId] = useState<string | null>(null);

  // 색상 팔레트 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerProjectId && !(e.target as HTMLElement).closest('[data-color-picker]')) {
        setColorPickerProjectId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [colorPickerProjectId]);

  const getProjectColor = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    // 저장된 색상이 있으면 사용
    if (project?.color) {
      const savedColor = projectColors.find((c) => c.key === project.color);
      if (savedColor) return savedColor;
    }
    // 없으면 인덱스 기반 기본 색상
    const index = projects.findIndex((p) => p.id === projectId);
    return projectColors[index % projectColors.length];
  };

  // 프로젝트 색상 변경
  const handleColorChange = async (projectId: string, colorKey: string) => {
    try {
      await updateProject(projectId, { color: colorKey });
      // 로컬 상태 업데이트
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, color: colorKey } : p))
      );
      setColorPickerProjectId(null);
    } catch (error) {
      console.error('색상 변경 실패:', error);
      alert('색상 변경에 실패했습니다.');
    }
  };

  const activeProjects = useMemo(() => {
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      return end >= new Date();
    });
  }, [projects]);

  // 본인에게 할당된 활성 프로젝트만 필터링
  const myActiveProjects = useMemo(() => {
    if (!member) return [];
    return activeProjects.filter((p) => {
      const allocations = (p as any).allocations || [];
      return allocations.some((a: any) => a.member_id === member.id);
    });
  }, [activeProjects, member]);

  const completedProjects = useMemo(() => {
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      return end < new Date();
    });
  }, [projects]);

  const toggleProjectVisibility = (projectId: string) => {
    setVisibleProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // 시간 문자열을 분으로 변환 (HH:mm -> 분)
  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  };

  // 분을 시간 문자열로 변환 (분 -> HH:mm)
  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // 시간 옵션 (0~23) with AM/PM 표시
  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
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
  }, []);

  // 분 옵션 (0, 15, 30, 45)
  const minuteOptions = [0, 15, 30, 45];

  // 시작시간에서 시/분 분리
  const getTimeHour = (time: string) => {
    if (!time) return '';
    return time.split(':')[0] || '';
  };

  const getTimeMinute = (time: string) => {
    if (!time) return '';
    return time.split(':')[1] || '';
  };

  // 시/분을 합쳐서 시간 문자열로
  const combineTime = (hour: string, minute: string) => {
    if (!hour) return '';
    const h = String(hour).padStart(2, '0');
    const m = String(minute || '0').padStart(2, '0');
    return `${h}:${m}`;
  };

  // 시작시간 시 변경
  const handleStartHourChange = (index: number, hour: string) => {
    const currentMinute = getTimeMinute(scheduleEntries[index].startTime) || '0';
    const newTime = combineTime(hour, currentMinute);
    handleStartTimeChange(index, newTime);
  };

  // 시작시간 분 변경
  const handleStartMinuteChange = (index: number, minute: string) => {
    const currentHour = getTimeHour(scheduleEntries[index].startTime);
    if (!currentHour) return;
    const newTime = combineTime(currentHour, minute);
    handleStartTimeChange(index, newTime);
  };

  // 종료시간 시 변경
  const handleEndHourChange = (index: number, hour: string) => {
    const currentMinute = getTimeMinute(scheduleEntries[index].endTime) || '0';
    const newTime = combineTime(hour, currentMinute);
    handleEndTimeChange(index, newTime);
  };

  // 종료시간 분 변경
  const handleEndMinuteChange = (index: number, minute: string) => {
    const currentHour = getTimeHour(scheduleEntries[index].endTime);
    if (!currentHour) return;
    const newTime = combineTime(currentHour, minute);
    handleEndTimeChange(index, newTime);
  };

  // 시작시간 변경 시 (업무시간이 있으면 종료시간 계산)
  const handleStartTimeChange = (index: number, startTime: string) => {
    const newEntries = [...scheduleEntries];
    newEntries[index].startTime = startTime;

    // 업무시간이 있으면 종료시간 계산
    const totalMinutes = parseInt(newEntries[index].hours || '0') * 60 + parseInt(newEntries[index].minutes || '0');
    if (startTime && totalMinutes > 0) {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + totalMinutes;
      newEntries[index].endTime = minutesToTime(endMinutes);
    }

    setScheduleEntries(newEntries);
  };

  // 종료시간 변경 시 (시작시간이 있으면 업무시간 계산)
  const handleEndTimeChange = (index: number, endTime: string) => {
    const newEntries = [...scheduleEntries];
    newEntries[index].endTime = endTime;

    // 시작시간이 있으면 업무시간 계산
    if (newEntries[index].startTime && endTime) {
      const startMinutes = timeToMinutes(newEntries[index].startTime);
      const endMinutes = timeToMinutes(endTime);
      let diff = endMinutes - startMinutes;
      if (diff < 0) diff += 24 * 60; // 자정을 넘는 경우

      // 15분 단위로 반올림
      const roundedMinutes = Math.round((diff % 60) / 15) * 15;
      const extraHour = roundedMinutes === 60 ? 1 : 0;

      newEntries[index].hours = String(Math.floor(diff / 60) + extraHour);
      newEntries[index].minutes = String(roundedMinutes === 60 ? 0 : roundedMinutes);
    }

    setScheduleEntries(newEntries);
  };

  // 업무시간 변경 시 (시작시간이 있으면 종료시간 계산)
  const handleDurationChange = (index: number, field: 'hours' | 'minutes', value: string) => {
    const newEntries = [...scheduleEntries];
    newEntries[index][field] = value;

    // 시작시간이 있으면 종료시간 계산
    if (newEntries[index].startTime) {
      const totalMinutes = parseInt(newEntries[index].hours || '0') * 60 + parseInt(newEntries[index].minutes || '0');
      const startMinutes = timeToMinutes(newEntries[index].startTime);
      const endMinutes = startMinutes + totalMinutes;
      newEntries[index].endTime = minutesToTime(endMinutes);
    }

    setScheduleEntries(newEntries);
  };

  // 스케줄 항목 추가
  const addScheduleEntry = () => {
    setScheduleEntries([...scheduleEntries, { projectId: '', hours: '1', minutes: '0', startTime: '', endTime: '', description: '' }]);
  };

  // 스케줄 항목 삭제
  const removeScheduleEntry = async (index: number) => {
    const entry = scheduleEntries[index];

    // DB에 저장된 스케줄이면 삭제
    if (entry.scheduleId) {
      try {
        await deleteSchedule(entry.scheduleId);
        // 로컬 상태에서도 제거
        setSchedules(schedules.filter((s) => s.id !== entry.scheduleId));
      } catch (error) {
        console.error('스케줄 삭제 실패:', error);
        alert('스케줄 삭제에 실패했습니다.');
        return;
      }
    }

    setScheduleEntries(scheduleEntries.filter((_, i) => i !== index));
  };

  // 스케줄 모달 열기 (빈 시간대 클릭)
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
        projectId: '',
        hours: '1',
        minutes: '0',
        startTime,
        endTime,
        description: ''
      }]);
    } else if (daySchedules.length > 0) {
      // 기존 스케줄이 있으면 불러오기
      setScheduleEntries(
        daySchedules.map((s) => ({
          projectId: s.project_id,
          hours: String(Math.floor(s.minutes / 60)),
          minutes: String(s.minutes % 60),
          startTime: (s as any).start_time || '',
          endTime: (s as any).end_time || '',
          description: (s as any).description || '',
          scheduleId: s.id,
        }))
      );
    } else {
      // 없으면 빈 항목 하나 (기본 9시 시작)
      setScheduleEntries([{ projectId: '', hours: '1', minutes: '0', startTime: '09:00', endTime: '10:00', description: '' }]);
    }

    setSelectedDate(date);
    setSelectedHour(hour ?? null);
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  // 기존 스케줄 클릭 시 수정 모달
  const openEditModal = (schedule: Schedule, date: Date) => {
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
  };

  // 스케줄 저장
  const saveSchedules = async () => {
    if (!member || !selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      for (const entry of scheduleEntries) {
        if (!entry.projectId) continue;

        const totalMinutes = parseInt(entry.hours || '0') * 60 + parseInt(entry.minutes || '0');

        if (totalMinutes === 0) continue;

        const scheduleData = {
          minutes: totalMinutes,
          start_time: entry.startTime || null,
          end_time: entry.endTime || null,
          description: entry.description || null,
        };

        if (entry.scheduleId) {
          // 기존 스케줄 수정
          await updateSchedule(entry.scheduleId, scheduleData);
        } else {
          // 새 스케줄 생성
          await createSchedule({
            org_id: member.org_id,
            project_id: entry.projectId,
            member_id: member.id,
            date: dateStr,
            ...scheduleData,
          } as any);
        }
      }

      // 데이터 새로고침
      const schedulesData = await getSchedules();
      setSchedules(schedulesData);
      setShowScheduleModal(false);
    } catch (error: any) {
      console.error('스케줄 저장 실패:', error);
      console.error('에러 메시지:', error?.message);
      console.error('에러 상세:', JSON.stringify(error, null, 2));
      alert(`스케줄 저장에 실패했습니다: ${error?.message || '알 수 없는 오류'}`);
    }
  };

  // 특정 날짜의 스케줄 가져오기
  const getDaySchedules = (date: Date) => {
    if (!member) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter(
      (s) => s.member_id === member.id && s.date === dateStr && visibleProjects[s.project_id]
    );
  };

  // 스케줄 블록의 위치 계산
  const getSchedulePosition = (schedule: Schedule) => {
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
  };

  // 겹치는 스케줄 처리
  const getOverlappingSchedules = (daySchedules: Schedule[]) => {
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
    // 겹치는 스케줄들을 그룹으로 묶기
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
  };

  // 드래그 시작
  const handleDragStart = (e: React.MouseEvent, scheduleId: string, type: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation();
    e.preventDefault();

    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

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
    };

    setIsDragging(true);
    setDragScheduleId(scheduleId);
    setDragType(type);
  };

  // 드래그 중 - 상태 기반으로 프리뷰 관리
  useEffect(() => {
    if (!isDragging || !dragScheduleId || !dragType) return;

    const dayColumns = document.querySelectorAll('[data-day-column]') as NodeListOf<HTMLElement>;
    const TOP_PADDING = 8;

    // 각 요일 컬럼의 위치 정보 캐시
    const columnRects = Array.from(dayColumns).map((col) => ({
      element: col,
      date: col.dataset.dayColumn || '',
      rect: col.getBoundingClientRect(),
    }));

    const handleMouseMove = (e: MouseEvent) => {
      const { startY, startX, originalStart, originalEnd, originalDate } = dragRef.current;
      const deltaY = e.clientY - startY;
      const deltaX = e.clientX - startX;

      // 5px 이상 움직여야 드래그로 인식
      if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
        dragRef.current.hasDragged = true;
      }

      const deltaMinutes = Math.round(deltaY / HOUR_HEIGHT * 60 / 15) * 15; // 15분 단위

      const originalStartMinutes = timeToMinutes(originalStart);
      const originalEndMinutes = timeToMinutes(originalEnd);

      let newStartMinutes = originalStartMinutes;
      let newEndMinutes = originalEndMinutes;
      let targetDate = originalDate;

      if (dragType === 'move') {
        newStartMinutes = originalStartMinutes + deltaMinutes;
        newEndMinutes = originalEndMinutes + deltaMinutes;

        // 마우스 위치로 날짜 결정
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

      // 범위 제한
      newStartMinutes = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, newStartMinutes));
      newEndMinutes = Math.max(START_HOUR * 60 + 15, Math.min(END_HOUR * 60, newEndMinutes));

      // ref에 현재 값 저장 (마우스업 시 사용)
      dragRef.current.currentStart = minutesToTime(newStartMinutes);
      dragRef.current.currentEnd = minutesToTime(newEndMinutes);
      dragRef.current.currentDate = targetDate;

      // 프리뷰 위치 계산
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
      const { hasDragged, currentStart, currentEnd, currentDate } = dragRef.current;

      // 프리뷰 제거
      setDragPreview(null);

      if (hasDragged) {
        const newMinutes = timeToMinutes(currentEnd) - timeToMinutes(currentStart);

        // 상태 업데이트 (한 번만)
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

        // DB 업데이트
        try {
          await updateSchedule(dragScheduleId, {
            date: currentDate,
            minutes: newMinutes,
            start_time: currentStart,
            end_time: currentEnd,
          });
        } catch (error) {
          console.error('스케줄 업데이트 실패:', error);
          // 실패 시 원래 값으로 복원
          const schedulesData = await getSchedules();
          setSchedules(schedulesData);
        }
      }

      setIsDragging(false);
      setDragScheduleId(null);
      setDragType(null);
      // hasDragged는 약간의 딜레이 후 초기화 (클릭 이벤트가 먼저 처리되도록)
      setTimeout(() => { dragRef.current.hasDragged = false; }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragScheduleId, dragType]);

  // 빈 공간 드래그로 새 스케줄 생성
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

  // 새 스케줄 생성 드래그 중
  useEffect(() => {
    if (!isCreating || !createDay) return;

    let currentStartHour = createStartHour;
    let currentEndHour = createEndHour;

    const handleMouseMove = (e: MouseEvent) => {
      const { dayColumnTop, initialHour } = createRef.current;
      const y = e.clientY - dayColumnTop;
      const hour = Math.floor(y / HOUR_HEIGHT) + START_HOUR;
      const clampedHour = Math.max(START_HOUR, Math.min(END_HOUR, hour));

      // 초기 시작점 기준으로 위/아래 방향 결정
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
      // 드래그 완료 시 모달 열기
      if (createDay && currentEndHour > currentStartHour) {
        const startTime = `${String(currentStartHour).padStart(2, '0')}:00`;
        const endTime = `${String(currentEndHour).padStart(2, '0')}:00`;
        const duration = currentEndHour - currentStartHour;

        setScheduleEntries([{
          projectId: '',
          hours: String(duration),
          minutes: '0',
          startTime,
          endTime,
          description: ''
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

  // 프로젝트 바 계산 (월간 뷰)
  const getProjectBars = (project: Project, displayDays: Date[]) => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    const firstDay = displayDays[0];
    const lastDay = displayDays[displayDays.length - 1];

    if (endDate < firstDay || startDate > lastDay) {
      return [];
    }

    const actualStart = startDate < firstDay ? firstDay : startDate;
    const actualEnd = endDate > lastDay ? lastDay : endDate;

    const bars = [];
    let currentDate = actualStart;

    while (currentDate <= actualEnd) {
      const dayIndex = differenceInDays(currentDate, firstDay);
      const rowIndex = Math.floor((dayIndex + monthStart.getDay()) / 7);
      const colInRow = (dayIndex + monthStart.getDay()) % 7;

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
  };

  // 프로젝트 레이어 계산
  const getProjectLayer = (project: Project, barStartDate: Date, visibleProjectsList: Project[]) => {
    const projectsOnSameDay = visibleProjectsList.filter((p) => {
      const pStart = new Date(p.start_date);
      const pEnd = new Date(p.end_date);
      return barStartDate >= pStart && barStartDate <= pEnd;
    });

    return projectsOnSameDay.findIndex((p) => p.id === project.id);
  };

  // 시간 라벨 포맷
  const formatHourLabel = (hour: number) => {
    if (hour === 0) return 'AM 12';
    if (hour < 12) return `AM ${hour}`;
    if (hour === 12) return 'PM 12';
    return `PM ${hour - 12}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 왼쪽 사이드바 */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* 달력 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              {format(currentDate, 'M월', { locale: ko })}{' '}
              <span className="text-gray-400 text-sm">{format(currentDate, 'yyyy')}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -30))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 30))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={idx} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}

            {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {calendarDays.map((day) => {
              const hasSchedule = getDaySchedules(day).length > 0;

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`aspect-square flex items-center justify-center text-xs rounded transition-colors cursor-pointer ${
                    isToday(day)
                      ? 'bg-blue-500 text-white font-bold'
                      : hasSchedule
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentDate(day)}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">내 프로젝트</h3>
          <div className="space-y-1">
            {myActiveProjects.map((project) => {
              const color = getProjectColor(project.id);
              const isColorPickerOpen = colorPickerProjectId === project.id;
              return (
                <div key={project.id} className="relative">
                  <div
                    className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {/* 색상 선택 버튼 */}
                    <button
                      data-color-picker
                      className={`w-4 h-4 rounded-full ${color.bg} flex-shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorPickerProjectId(isColorPickerOpen ? null : project.id);
                      }}
                      title="색상 변경"
                    />
                    <span
                      className="flex-1 text-gray-900 truncate text-xs"
                      onClick={() => toggleProjectVisibility(project.id)}
                    >
                      {project.name}
                    </span>
                    <button
                      className="flex-shrink-0"
                      onClick={() => toggleProjectVisibility(project.id)}
                    >
                      {visibleProjects[project.id] ? (
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </button>
                  </div>
                  {/* 색상 팔레트 팝오버 */}
                  {isColorPickerOpen && (
                    <div
                      data-color-picker
                      className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50"
                    >
                      <div className="grid grid-cols-5 gap-1">
                        {projectColors.map((c) => (
                          <button
                            key={c.key}
                            className={`w-6 h-6 rounded-full ${c.bg} hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 transition-all ${
                              color.key === c.key ? 'ring-2 ring-offset-1 ring-gray-600' : ''
                            }`}
                            onClick={() => handleColorChange(project.id, c.key)}
                            title={c.key}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {completedProjects.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">종료된 프로젝트</h3>
              <div className="space-y-1">
                {completedProjects.slice(0, 5).map((project) => {
                  const color = getProjectColor(project.id);
                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer opacity-60"
                      onClick={() => toggleProjectVisibility(project.id)}
                    >
                      <div className={`w-3 h-3 rounded ${color.bg}`} />
                      <span className="flex-1 text-gray-500 truncate text-xs">{project.name}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">스케줄</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  오늘
                </button>
                <button
                  onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'week' ? -7 : -30))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'week' ? 7 : 30))}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-lg font-medium text-gray-900 ml-2">
                  {viewMode === 'week'
                    ? `${format(weekDays[0], 'M월 d일')} - ${format(weekDays[6], 'M월 d일')}`
                    : format(currentDate, 'yyyy년 M월')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                업무 입력
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                프로젝트 스케줄 확인
              </button>
            </div>
          </div>
        </div>

        {/* 컨텐츠 */}
        {viewMode === 'week' ? (
          /* 주간 타임라인 뷰 */
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* 요일 헤더 */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="w-16 flex-shrink-0" /> {/* 시간 컬럼 공간 */}
              {weekDays.map((day) => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className="flex-1 text-center py-3 border-l border-gray-200"
                >
                  <div className="text-xs text-gray-500 uppercase">
                    {format(day, 'EEE', { locale: ko })}
                  </div>
                  <div
                    className={`text-lg font-medium mt-0.5 ${
                      isToday(day)
                        ? 'w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto'
                        : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* 타임라인 그리드 */}
            <div ref={timelineRef} className="flex-1 overflow-auto">
              <div className="flex pt-2" style={{ height: TOTAL_HOURS * HOUR_HEIGHT + 16 }}>
                {/* 시간 라벨 */}
                <div className="w-16 flex-shrink-0 relative">
                  {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute right-2 text-xs text-gray-500 whitespace-nowrap"
                      style={{ top: i * HOUR_HEIGHT }}
                    >
                      {formatHourLabel(START_HOUR + i)}
                    </div>
                  ))}
                </div>

                {/* 각 요일 컬럼 */}
                {weekDays.map((day) => {
                  const daySchedules = getDaySchedules(day);
                  const positionedSchedules = getOverlappingSchedules(daySchedules);

                  const TOP_PADDING = 8; // pt-2 = 8px
                  const isCreatingOnThisDay = isCreating && createDay && format(createDay, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

                  return (
                    <div
                      key={format(day, 'yyyy-MM-dd')}
                      data-day-column={format(day, 'yyyy-MM-dd')}
                      className="flex-1 relative border-l border-gray-200"
                      onMouseDown={(e) => {
                        // 빈 공간에서만 드래그 시작 (스케줄 블록이 아닌 경우)
                        if ((e.target as HTMLElement).closest('[data-schedule-block]')) return;
                        handleCreateDragStart(e, day, e.currentTarget as HTMLDivElement);
                      }}
                    >
                      {/* 시간 그리드 라인 */}
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-full border-t border-gray-100 cursor-crosshair hover:bg-blue-50 transition-colors"
                          style={{ top: TOP_PADDING + i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                          onClick={(e) => {
                            // 드래그 중이 아닐 때만 클릭 처리
                            if (!isCreating) {
                              openScheduleModal(day, START_HOUR + i);
                            }
                          }}
                        />
                      ))}

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

                      {/* 현재 시간 표시 */}
                      {isToday(day) && (
                        <div
                          className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none"
                          style={{
                            top: TOP_PADDING + ((new Date().getHours() + new Date().getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT,
                          }}
                        >
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full -mt-1.5 -ml-1" />
                        </div>
                      )}

                      {/* 스케줄 블록들 */}
                      {positionedSchedules.map(({ schedule, column, totalColumns }) => {
                        const pos = getSchedulePosition(schedule);
                        const project = projects.find((p) => p.id === schedule.project_id);
                        const color = getProjectColor(schedule.project_id);
                        const width = 100 / totalColumns;
                        const left = column * width;
                        const isBeingDragged = isDragging && dragScheduleId === schedule.id;

                        return (
                          <div
                            key={schedule.id}
                            data-schedule-block
                            data-schedule-id={schedule.id}
                            className={`absolute rounded-lg ${color.bg} ${color.text} shadow-sm cursor-pointer hover:shadow-md z-10 ${
                              isBeingDragged ? 'opacity-30' : ''
                            }`}
                            style={{
                              top: TOP_PADDING + pos.top,
                              height: pos.height,
                              left: `calc(${left}% + 2px)`,
                              width: `calc(${width}% - 4px)`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // 드래그가 발생하지 않았을 때만 모달 열기
                              if (!dragRef.current.hasDragged) {
                                openEditModal(schedule, day);
                              }
                            }}
                          >
                            {/* 상단 리사이즈 핸들 */}
                            <div
                              className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black/10 rounded-t-lg"
                              onMouseDown={(e) => handleDragStart(e, schedule.id, 'resize-top')}
                            />

                            {/* 내용 */}
                            <div
                              className="p-2 h-full overflow-hidden cursor-move"
                              onMouseDown={(e) => handleDragStart(e, schedule.id, 'move')}
                            >
                              <div className="text-sm font-semibold truncate">
                                {project?.name}
                              </div>
                              <div className="text-xs font-medium mt-1 opacity-90">
                                {(schedule as any).start_time} - {(schedule as any).end_time}
                              </div>
                              {pos.height >= 80 && (
                                <div className="text-xs mt-1 opacity-75">
                                  {Math.floor(schedule.minutes / 60)}시간 {schedule.minutes % 60 > 0 ? `${schedule.minutes % 60}분` : ''}
                                </div>
                              )}
                              {pos.height >= 100 && (schedule as any).description && (
                                <div className="text-xs mt-1 opacity-75 line-clamp-2">
                                  {(schedule as any).description}
                                </div>
                              )}
                            </div>

                            {/* 하단 리사이즈 핸들 */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 rounded-b-lg"
                              onMouseDown={(e) => handleDragStart(e, schedule.id, 'resize-bottom')}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* 월간 뷰 */
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div key={idx} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* 달력 그리드 */}
              <div className="relative">
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-24 bg-gray-50 rounded-lg" />
                  ))}

                  {calendarDays.map((day) => {
                    const daySchedules = getDaySchedules(day);

                    return (
                      <div
                        key={format(day, 'yyyy-MM-dd')}
                        className={`h-24 rounded-lg border cursor-pointer transition-colors hover:border-blue-300 ${
                          isToday(day)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                        }`}
                        onClick={() => openScheduleModal(day)}
                      >
                        <div className="p-1">
                          <div className={`text-sm font-medium ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                            {format(day, 'd')}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {daySchedules.slice(0, 2).map((schedule) => {
                              const project = projects.find((p) => p.id === schedule.project_id);
                              const color = getProjectColor(schedule.project_id);
                              return (
                                <div
                                  key={schedule.id}
                                  className={`text-xs truncate px-1 py-0.5 rounded ${color.bg} ${color.text}`}
                                >
                                  {project?.name}
                                </div>
                              );
                            })}
                            {daySchedules.length > 2 && (
                              <div className="text-xs text-gray-500 px-1">
                                +{daySchedules.length - 2}개
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 프로젝트 기간 바 (활성 프로젝트) */}
                <div className="absolute top-0 left-0 right-0 pointer-events-none">
                  {activeProjects
                    .filter((p) => visibleProjects[p.id])
                    .map((project) => {
                      const bars = getProjectBars(project, calendarDays);
                      if (bars.length === 0) return null;

                      const visibleProjectsList = activeProjects.filter((p) => visibleProjects[p.id]);
                      const color = getProjectColor(project.id);

                      return bars.map((bar, barIdx) => {
                        const layer = getProjectLayer(project, bar.startDate, visibleProjectsList);
                        const barHeight = 1.25;

                        return (
                          <div
                            key={`${project.id}-${barIdx}`}
                            className={`absolute ${color.bg} rounded px-2 py-0.5 text-xs font-medium ${color.text} shadow-sm pointer-events-auto cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                            style={{
                              top: `${bar.row * 6.5 + 1.75 + layer * barHeight}rem`,
                              left: `${bar.col * 14.285}%`,
                              width: `${bar.width * 14.285}%`,
                              height: `${barHeight}rem`,
                              zIndex: 10 + layer,
                            }}
                            title={`${project.name}\n${format(new Date(project.start_date), 'yyyy/MM/dd')} ~ ${format(new Date(project.end_date), 'yyyy/MM/dd')}`}
                          >
                            {barIdx === 0 && (
                              <div className="truncate leading-tight">{project.name}</div>
                            )}
                          </div>
                        );
                      });
                    })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 스케줄 추가/수정 모달 */}
      {showScheduleModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSchedule ? '스케줄 수정' : '스케줄 추가'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {scheduleEntries.map((entry, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    {/* 프로젝트 선택 및 삭제 버튼 */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <select
                          value={entry.projectId}
                          onChange={(e) => {
                            const newEntries = [...scheduleEntries];
                            newEntries[index].projectId = e.target.value;
                            setScheduleEntries(newEntries);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">프로젝트 선택</option>
                          {myActiveProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => removeScheduleEntry(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 시간 입력 영역 */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* 시작 시간 */}
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600 w-16">시작시간</span>
                        <select
                          value={getTimeHour(entry.startTime)}
                          onChange={(e) => handleStartHourChange(index, e.target.value)}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">시</option>
                          {hourOptions.map((h) => (
                            <option key={h.value} value={String(h.value).padStart(2, '0')}>{h.label}</option>
                          ))}
                        </select>
                        <select
                          value={getTimeMinute(entry.startTime)}
                          onChange={(e) => handleStartMinuteChange(index, e.target.value)}
                          className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">분</option>
                          {minuteOptions.map((m) => (
                            <option key={m} value={String(m).padStart(2, '0')}>{m}분</option>
                          ))}
                        </select>
                      </div>

                      {/* 종료 시간 */}
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600 w-16">종료시간</span>
                        <select
                          value={getTimeHour(entry.endTime)}
                          onChange={(e) => handleEndHourChange(index, e.target.value)}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">시</option>
                          {hourOptions.map((h) => (
                            <option key={h.value} value={String(h.value).padStart(2, '0')}>{h.label}</option>
                          ))}
                        </select>
                        <select
                          value={getTimeMinute(entry.endTime)}
                          onChange={(e) => handleEndMinuteChange(index, e.target.value)}
                          className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">분</option>
                          {minuteOptions.map((m) => (
                            <option key={m} value={String(m).padStart(2, '0')}>{m}분</option>
                          ))}
                        </select>
                      </div>

                      {/* 구분선 */}
                      <div className="h-8 w-px bg-gray-300 hidden sm:block" />

                      {/* 업무 시간 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-16">업무시간</span>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={entry.hours}
                          onChange={(e) => handleDurationChange(index, 'hours', e.target.value)}
                          className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-600 text-sm">시간</span>
                        <select
                          value={entry.minutes}
                          onChange={(e) => handleDurationChange(index, 'minutes', e.target.value)}
                          className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="0">0</option>
                          <option value="15">15</option>
                          <option value="30">30</option>
                          <option value="45">45</option>
                        </select>
                        <span className="text-gray-600 text-sm">분</span>
                      </div>
                    </div>

                    {/* 업무 내용 */}
                    <div className="mt-3">
                      <label className="block text-sm text-gray-600 mb-1">업무 내용</label>
                      <textarea
                        value={entry.description}
                        onChange={(e) => {
                          const newEntries = [...scheduleEntries];
                          newEntries[index].description = e.target.value;
                          setScheduleEntries(newEntries);
                        }}
                        placeholder="수행한 업무 내용을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 항목 추가 버튼 */}
              {!editingSchedule && (
                <button
                  onClick={addScheduleEntry}
                  className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  프로젝트 추가
                </button>
              )}

              {/* 총 시간 표시 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">총 업무 시간</div>
                <div className="text-2xl font-bold text-blue-700">
                  {(() => {
                    const totalMinutes = scheduleEntries.reduce((sum, entry) => {
                      return sum + (parseInt(entry.hours || '0') * 60) + parseInt(entry.minutes || '0');
                    }, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    return `${hours}시간 ${mins}분`;
                  })()}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveSchedules}
                className="px-6 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 드래그 프리뷰 (fixed position으로 화면에 표시) */}
      {dragPreview && dragScheduleId && (
        <div
          className="fixed rounded-lg shadow-lg z-50 pointer-events-none"
          style={{
            top: dragPreview.top,
            left: dragPreview.left,
            width: dragPreview.width,
            height: dragPreview.height,
            backgroundColor: getProjectColor(
              schedules.find((s) => s.id === dragScheduleId)?.project_id || ''
            ).hex || '#3b82f6',
            opacity: 0.9,
          }}
        >
          <div className="p-2 text-white h-full overflow-hidden">
            <div className="text-sm font-semibold truncate">
              {projects.find((p) => p.id === schedules.find((s) => s.id === dragScheduleId)?.project_id)?.name}
            </div>
            <div className="text-xs font-medium mt-1 opacity-90">
              {dragPreview.startTime} - {dragPreview.endTime}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
