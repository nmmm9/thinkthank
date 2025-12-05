'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Project, Schedule, Member, WorkTimeSetting } from '@/lib/supabase/database.types';
import type { ColorInfo, ViewMode } from '../types';

interface ScheduleContextValue {
  // 사용자 정보
  member: Member | null;

  // 데이터
  projects: Project[];
  schedules: Schedule[];
  teamMembers: Member[];
  workTimeSetting: WorkTimeSetting | null;

  // 필터/가시성
  visibleProjects: Record<string, boolean>;
  visibleMembers: Record<string, boolean>;
  showMySchedule: boolean;
  myColor: string | null;

  // 날짜/뷰
  currentDate: Date;
  viewMode: ViewMode;

  // 필터링된 데이터
  activeProjects: Project[];
  myActiveProjects: Project[];
  completedProjects: Project[];

  // 액션
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleProjectVisibility: (id: string) => void;
  toggleMemberVisibility: (id: string) => void;
  setShowMySchedule: (show: boolean) => void;

  // 색상
  getProjectColor: (projectId: string | null) => ColorInfo & { isCustom?: boolean };
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };

  // 스케줄 조회
  getDaySchedules: (date: Date, includeOthers?: boolean) => Schedule[];
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function useScheduleContext() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error('useScheduleContext must be used within ScheduleProvider');
  }
  return ctx;
}

interface ScheduleProviderProps {
  children: ReactNode;
  value: ScheduleContextValue;
}

export function ScheduleProvider({ children, value }: ScheduleProviderProps) {
  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export { ScheduleContext };
