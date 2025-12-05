'use client';

import { format, addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import type { ViewMode } from '../types';

interface ScheduleHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  unclassifiedCount: number;
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  onShowUnclassifiedModal: () => void;
}

export function ScheduleHeader({
  currentDate,
  viewMode,
  unclassifiedCount,
  setCurrentDate,
  setViewMode,
  onShowUnclassifiedModal,
}: ScheduleHeaderProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
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

      {/* 미분류 스케줄 알림 */}
      {unclassifiedCount > 0 && (
        <div
          className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={onShowUnclassifiedModal}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800">
              <strong>{unclassifiedCount}개</strong>의 미분류 스케줄이 있습니다
            </span>
          </div>
          <span className="text-sm text-amber-600 font-medium">프로젝트 지정하기 →</span>
        </div>
      )}
    </div>
  );
}
