'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { DayCell } from './DayCell';
import { ProjectBar } from './ProjectBar';
import { getProjectBars, getProjectLayer } from '../../utils/position';
import type { Schedule, Project, Member } from '@/lib/supabase/database.types';
import type { ColorInfo } from '../../types';

interface MonthViewProps {
  currentDate: Date;
  activeProjects: Project[];
  visibleProjects: Record<string, boolean>;
  member: Member | null;
  teamMembers: Member[];
  getDaySchedules: (date: Date) => Schedule[];
  getProjectColor: (projectId: string | null) => ColorInfo & { isCustom?: boolean };
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  openScheduleModal: (date: Date) => void;
  projects: Project[];
}

export function MonthView({
  currentDate,
  activeProjects,
  visibleProjects,
  member,
  teamMembers,
  getDaySchedules,
  getProjectColor,
  getMemberColor,
  openScheduleModal,
  projects,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const visibleProjectsList = activeProjects.filter((p) => visibleProjects[p.id]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div
              key={idx}
              className={`text-center text-sm font-medium py-2 ${
                idx === 0 || idx === 6 ? 'text-red-400' : 'text-gray-600'
              }`}
            >
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

            {calendarDays.map((day) => (
              <DayCell
                key={format(day, 'yyyy-MM-dd')}
                day={day}
                daySchedules={getDaySchedules(day)}
                projects={projects}
                teamMembers={teamMembers}
                member={member}
                getMemberColor={getMemberColor}
                openScheduleModal={openScheduleModal}
              />
            ))}
          </div>

          {/* 프로젝트 기간 바 (활성 프로젝트) */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none">
            {visibleProjectsList.map((project) => {
              const bars = getProjectBars(project, calendarDays, monthStart.getDay());
              if (bars.length === 0) return null;

              const color = getProjectColor(project.id);
              const layer = getProjectLayer(project, bars[0]?.startDate || new Date(), visibleProjectsList);

              return (
                <ProjectBar
                  key={project.id}
                  project={project}
                  bars={bars}
                  color={color}
                  layer={layer}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { DayCell } from './DayCell';
export { ProjectBar } from './ProjectBar';
