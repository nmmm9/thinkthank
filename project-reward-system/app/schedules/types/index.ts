import type { Project, Schedule, Member, WorkTimeSetting } from '@/lib/supabase/database.types';

// 스케줄 항목 폼 데이터
export interface ScheduleEntry {
  projectId: string;
  hours: string;
  minutes: string;
  startTime: string;
  endTime: string;
  description: string;
  scheduleId?: string;
}

// 드래그 프리뷰 상태
export interface DragPreviewState {
  top: number;
  height: number;
  left: number;
  width: number;
  date: string;
  startTime: string;
  endTime: string;
}

// 컨텍스트 메뉴 상태
export interface ContextMenuState {
  x: number;
  y: number;
  scheduleId: string;
}

// 팀원 스케줄 보기 상태
export interface ViewingScheduleState {
  schedule: Schedule;
  member: Member;
  project: Project | null;
}

// 겹치는 스케줄 위치 정보
export interface PositionedSchedule {
  schedule: Schedule;
  column: number;
  totalColumns: number;
}

// 스케줄 위치 계산 결과
export interface SchedulePosition {
  top: number;
  height: number;
}

// 프로젝트 바 (월간 뷰)
export interface ProjectBar {
  row: number;
  col: number;
  width: number;
  startDate: Date;
}

// 뷰 모드
export type ViewMode = 'week' | 'month';

// 드래그 타입
export type DragType = 'move' | 'resize-top' | 'resize-bottom' | null;

// 색상 정보
export interface ColorInfo {
  key?: string;
  bg?: string;
  hover?: string;
  text: string;
  light?: string;
  hex: string;
}
