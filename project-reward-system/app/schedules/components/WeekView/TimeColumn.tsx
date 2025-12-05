'use client';

import { HOUR_HEIGHT, START_HOUR, END_HOUR, TOTAL_HOURS } from '../../constants';
import { formatHourLabel } from '../../utils/time';
import type { WorkTimeSetting } from '@/lib/supabase/database.types';

interface TimeColumnProps {
  workTimeSetting: WorkTimeSetting | null;
}

export function TimeColumn({ workTimeSetting }: TimeColumnProps) {
  const workStart = workTimeSetting?.work_start_time || '09:30';
  const workEnd = workTimeSetting?.work_end_time || '18:30';
  const [startH, startM] = workStart.split(':').map(Number);
  const [endH, endM] = workEnd.split(':').map(Number);
  const workStartHour = startH + startM / 60;
  const workEndHour = endH + endM / 60;

  const beforeHeight = Math.max(0, (workStartHour - START_HOUR) * HOUR_HEIGHT);
  const afterTop = (workEndHour - START_HOUR) * HOUR_HEIGHT;
  const afterHeight = Math.max(0, (END_HOUR - workEndHour) * HOUR_HEIGHT);

  return (
    <div className="w-16 flex-shrink-0 relative">
      {/* 업무시간 외 영역 표시 */}
      {beforeHeight > 0 && (
        <div
          className="absolute w-full bg-gray-100 opacity-50"
          style={{ top: 0, height: beforeHeight }}
        />
      )}
      {afterHeight > 0 && (
        <div
          className="absolute w-full bg-gray-100 opacity-50"
          style={{ top: afterTop, height: afterHeight }}
        />
      )}

      {/* 시간 라벨 */}
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
        const hour = START_HOUR + i;
        const isWorkHour = hour >= startH && hour < endH;

        return (
          <div
            key={i}
            className={`absolute right-2 text-xs whitespace-nowrap ${
              isWorkHour ? 'text-gray-700 font-medium' : 'text-gray-400'
            }`}
            style={{ top: i * HOUR_HEIGHT }}
          >
            {formatHourLabel(hour)}
          </div>
        );
      })}
    </div>
  );
}
