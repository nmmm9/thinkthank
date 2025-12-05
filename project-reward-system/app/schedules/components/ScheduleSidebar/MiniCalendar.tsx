'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Schedule } from '@/lib/supabase/database.types';

interface MiniCalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  getDaySchedules: (date: Date) => Schedule[];
}

export function MiniCalendar({ currentDate, setCurrentDate, getDaySchedules }: MiniCalendarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
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
  );
}
