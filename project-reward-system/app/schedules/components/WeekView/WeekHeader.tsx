'use client';

import { format, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { isWorkingDay } from '@/lib/utils/workdays';

interface WeekHeaderProps {
  weekDays: Date[];
}

export function WeekHeader({ weekDays }: WeekHeaderProps) {
  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      <div className="w-16 flex-shrink-0" /> {/* 시간 컬럼 공간 */}
      {weekDays.map((day) => {
        const isNonWorkingDay = !isWorkingDay(day);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

        return (
          <div
            key={format(day, 'yyyy-MM-dd')}
            className={`flex-1 text-center py-3 border-l border-gray-200 ${
              isNonWorkingDay ? 'bg-gray-100' : ''
            }`}
          >
            <div className={`text-xs uppercase ${
              isWeekend ? 'text-red-400' : isNonWorkingDay ? 'text-orange-400' : 'text-gray-500'
            }`}>
              {format(day, 'EEE', { locale: ko })}
              {isNonWorkingDay && !isWeekend && (
                <span className="ml-1 text-orange-400">휴</span>
              )}
            </div>
            <div
              className={`text-lg font-medium mt-0.5 ${
                isToday(day)
                  ? 'w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto'
                  : isWeekend
                    ? 'text-red-400'
                    : isNonWorkingDay
                      ? 'text-orange-400'
                      : 'text-gray-900'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
