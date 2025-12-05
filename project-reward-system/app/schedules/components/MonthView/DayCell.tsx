'use client';

import { format, isToday } from 'date-fns';
import { isWorkingDay } from '@/lib/utils/workdays';
import type { Schedule, Project, Member } from '@/lib/supabase/database.types';
import type { ColorInfo } from '../../types';

interface DayCellProps {
  day: Date;
  daySchedules: Schedule[];
  projects: Project[];
  teamMembers: Member[];
  member: Member | null;
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  openScheduleModal: (date: Date) => void;
}

export function DayCell({
  day,
  daySchedules,
  projects,
  teamMembers,
  member,
  getMemberColor,
  openScheduleModal,
}: DayCellProps) {
  const isNonWorkingDay = !isWorkingDay(day);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  return (
    <div
      className={`h-24 rounded-lg border cursor-pointer transition-colors hover:border-blue-300 ${
        isToday(day)
          ? 'bg-blue-50 border-blue-200'
          : isNonWorkingDay
            ? 'bg-gray-100 border-gray-200'
            : 'bg-white border-gray-200'
      }`}
      onClick={() => openScheduleModal(day)}
    >
      <div className="p-1">
        <div className={`text-sm font-medium flex items-center gap-1 ${
          isToday(day)
            ? 'text-blue-600'
            : isWeekend
              ? 'text-red-400'
              : isNonWorkingDay
                ? 'text-orange-400'
                : 'text-gray-900'
        }`}>
          {format(day, 'd')}
          {isNonWorkingDay && !isWeekend && (
            <span className="text-xs text-orange-400">휴</span>
          )}
        </div>
        <div className="mt-1 space-y-0.5">
          {daySchedules.slice(0, 2).map((schedule) => {
            const project = projects.find((p) => p.id === schedule.project_id);
            const isOwnSchedule = schedule.member_id === member?.id;
            const color = getMemberColor(schedule.member_id);
            const scheduleMember = !isOwnSchedule ? teamMembers.find((m) => m.id === schedule.member_id) : null;
            return (
              <div
                key={schedule.id}
                className={`text-xs truncate px-1 py-0.5 rounded ${color.bg || ''} ${color.text}`}
                style={color.hex ? { backgroundColor: color.hex } : undefined}
              >
                {!isOwnSchedule && scheduleMember ? `${scheduleMember.name}: ` : ''}{project?.name || '기타'}
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
}
