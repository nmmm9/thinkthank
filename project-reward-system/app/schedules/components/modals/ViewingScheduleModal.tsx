'use client';

import { X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ViewingScheduleState, ColorInfo } from '../../types';

interface ViewingScheduleModalProps {
  data: ViewingScheduleState | null;
  onClose: () => void;
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
}

export function ViewingScheduleModal({ data, onClose, getMemberColor }: ViewingScheduleModalProps) {
  if (!data) return null;

  const { schedule, member, project } = data;
  const color = getMemberColor(member.id);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 멤버 색상 */}
        <div
          className="px-5 py-4"
          style={{ backgroundColor: color.hex }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {member.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">{member.name}</h3>
              <p className="text-white/80 text-sm">
                {format(new Date(schedule.date), 'M월 d일 (EEEE)', { locale: ko })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-5 space-y-4">
          {/* 프로젝트 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">프로젝트</p>
              <p className="text-gray-900 font-medium">{project?.name || '기타'}</p>
            </div>
          </div>

          {/* 시간 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">시간</p>
              <p className="text-gray-900 font-medium">
                {(schedule as any).start_time} - {(schedule as any).end_time}
                <span className="text-gray-500 text-sm ml-2">
                  ({Math.floor(schedule.minutes / 60)}시간
                  {schedule.minutes % 60 > 0 ? ` ${schedule.minutes % 60}분` : ''})
                </span>
              </p>
            </div>
          </div>

          {/* 업무 내용 */}
          {(schedule as any).description && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">업무 내용</p>
                <p className="text-gray-900">{(schedule as any).description}</p>
              </div>
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
