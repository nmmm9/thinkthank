'use client';

import { useMemo } from 'react';
import { Clock, Briefcase } from 'lucide-react';
import type { Project, Schedule, WorkTimeSetting } from '@/lib/supabase/database.types';
import { calculateEffectiveMinutes } from '@/lib/utils/workdays';

interface WeeklyProjectSummaryProps {
  weekSchedules: Schedule[];
  projects: Project[];
  memberId: string | undefined;
  workTimeSetting: WorkTimeSetting | null;
  getLunchHoursForDate: (date: string) => { start: string; end: string };
}

export function WeeklyProjectSummary({
  weekSchedules,
  projects,
  memberId,
  workTimeSetting,
  getLunchHoursForDate,
}: WeeklyProjectSummaryProps) {
  // 업무시간 설정
  const workHours = {
    start: workTimeSetting?.work_start_time || '09:30',
    end: workTimeSetting?.work_end_time || '18:30',
  };

  // 내 스케줄만 필터링하고 프로젝트별로 그룹화
  const projectSummary = useMemo(() => {
    if (!memberId) return [];

    const mySchedules = weekSchedules.filter(s => s.member_id === memberId);

    // 프로젝트별 시간 합계 (유효 업무시간만 계산)
    const projectMinutes: Record<string, number> = {};

    mySchedules.forEach(schedule => {
      const projectId = schedule.project_id || 'unclassified';
      if (!projectMinutes[projectId]) {
        projectMinutes[projectId] = 0;
      }
      // 점심시간 제외, 업무시간 내 유효 시간만 계산
      const lunchHours = getLunchHoursForDate(schedule.date);
      const effectiveMinutes = calculateEffectiveMinutes(schedule, workHours, lunchHours);
      projectMinutes[projectId] += effectiveMinutes;
    });

    // 프로젝트 정보와 함께 정렬
    const summary = Object.entries(projectMinutes)
      .map(([projectId, minutes]) => {
        const project = projects.find(p => p.id === projectId);
        return {
          projectId,
          projectName: project?.name || '미분류',
          minutes,
          hours: Math.floor(minutes / 60),
          remainingMinutes: minutes % 60,
          color: project?.color || '#9ca3af',
          isUnclassified: projectId === 'unclassified',
        };
      })
      .sort((a, b) => b.minutes - a.minutes); // 시간 많은 순으로 정렬

    return summary;
  }, [weekSchedules, projects, memberId, workHours, getLunchHoursForDate]);

  // 총 업무 시간
  const totalMinutes = useMemo(() => {
    return projectSummary.reduce((sum, p) => sum + p.minutes, 0);
  }, [projectSummary]);

  const totalHours = Math.floor(totalMinutes / 60);
  const totalRemainingMinutes = totalMinutes % 60;

  if (projectSummary.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          이번 주 업무 현황
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">
          이번 주 등록된 스케줄이 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        이번 주 업무 현황
      </h3>

      {/* 총 업무 시간 */}
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <div className="text-xs text-blue-600 mb-1">총 업무 시간</div>
        <div className="text-lg font-bold text-blue-700">
          {totalHours}시간 {totalRemainingMinutes > 0 && `${totalRemainingMinutes}분`}
        </div>
      </div>

      {/* 프로젝트별 업무 시간 */}
      <div className="space-y-2">
        {projectSummary.map(({ projectId, projectName, hours, remainingMinutes, minutes, color, isUnclassified }) => {
          const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;

          return (
            <div key={projectId} className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isUnclassified ? '#ef4444' : color }}
                  />
                  <span className={`text-sm truncate ${isUnclassified ? 'text-red-600' : 'text-gray-700'}`}>
                    {projectName}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 flex-shrink-0 ml-2">
                  {hours}시간{remainingMinutes > 0 && ` ${remainingMinutes}분`}
                </span>
              </div>
              {/* 진행률 바 */}
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: isUnclassified ? '#ef4444' : color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
