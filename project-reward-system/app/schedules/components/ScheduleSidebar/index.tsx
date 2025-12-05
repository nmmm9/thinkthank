'use client';

import type { Project, Schedule, Member } from '@/lib/supabase/database.types';
import type { ColorInfo } from '../../types';
import { MiniCalendar } from './MiniCalendar';
import { ProjectList } from './ProjectList';
import { MemberVisibilityList } from './MemberVisibilityList';
import { WeeklyProjectSummary } from './WeeklyProjectSummary';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';

interface ScheduleSidebarProps {
  // 사용자 정보
  member: Member | null;

  // 날짜
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // 프로젝트
  myActiveProjects: Project[];
  completedProjects: Project[];
  allProjects: Project[];

  // 스케줄 조회
  getDaySchedules: (date: Date) => Schedule[];
  weekSchedules: Schedule[];

  // 업무시간/점심시간 설정
  workTimeSetting: import('@/lib/supabase/database.types').WorkTimeSetting | null;
  getLunchHoursForDate: (date: string) => { start: string; end: string };

  // 멤버 관련
  teamMembers: Member[];
  showMySchedule: boolean;
  visibleMembers: Record<string, boolean>;
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  setShowMySchedule: (show: boolean) => void;
  toggleMemberVisibility: (memberId: string) => void;
  onMemberColorChange: (memberId: string, color: string) => void;

  // Google Calendar
  onSyncComplete: () => Promise<void>;
}

export function ScheduleSidebar({
  member,
  currentDate,
  setCurrentDate,
  myActiveProjects,
  completedProjects,
  allProjects,
  getDaySchedules,
  weekSchedules,
  workTimeSetting,
  getLunchHoursForDate,
  teamMembers,
  showMySchedule,
  visibleMembers,
  getMemberColor,
  setShowMySchedule,
  toggleMemberVisibility,
  onMemberColorChange,
  onSyncComplete,
}: ScheduleSidebarProps) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
      {/* 달력 */}
      <MiniCalendar
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        getDaySchedules={getDaySchedules}
      />

      {/* 프로젝트 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        <ProjectList
          myActiveProjects={myActiveProjects}
          completedProjects={completedProjects}
          getMemberColor={getMemberColor}
          memberId={member?.id}
        />

        <MemberVisibilityList
          member={member}
          teamMembers={teamMembers}
          showMySchedule={showMySchedule}
          visibleMembers={visibleMembers}
          getMemberColor={getMemberColor}
          setShowMySchedule={setShowMySchedule}
          toggleMemberVisibility={toggleMemberVisibility}
          onMemberColorChange={onMemberColorChange}
        />

        {/* 이번 주 업무 현황 */}
        <WeeklyProjectSummary
          weekSchedules={weekSchedules}
          projects={allProjects}
          memberId={member?.id}
          workTimeSetting={workTimeSetting}
          getLunchHoursForDate={getLunchHoursForDate}
        />

        {/* Google Calendar 연동 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <GoogleCalendarSync onSyncComplete={onSyncComplete} />
        </div>
      </div>
    </div>
  );
}

export { MiniCalendar } from './MiniCalendar';
export { ProjectList } from './ProjectList';
export { MemberVisibilityList } from './MemberVisibilityList';
