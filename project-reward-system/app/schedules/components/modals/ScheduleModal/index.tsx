'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Plus } from 'lucide-react';
import { ScheduleEntryForm } from './ScheduleEntryForm';
import type { Project, Schedule } from '@/lib/supabase/database.types';
import type { ScheduleEntry } from '../../../types';

interface ScheduleModalProps {
  isOpen: boolean;
  selectedDate: Date | null;
  editingSchedule: Schedule | null;
  scheduleEntries: ScheduleEntry[];
  myActiveProjects: Project[];
  onClose: () => void;
  onSave: () => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;
  onUpdateEntry: (index: number, updates: Partial<ScheduleEntry>) => void;
}

export function ScheduleModal({
  isOpen,
  selectedDate,
  editingSchedule,
  scheduleEntries,
  myActiveProjects,
  onClose,
  onSave,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
}: ScheduleModalProps) {
  if (!isOpen || !selectedDate) return null;

  // 총 시간 계산
  const totalMinutes = scheduleEntries.reduce((sum, entry) => {
    return sum + (parseInt(entry.hours || '0') * 60) + parseInt(entry.minutes || '0');
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingSchedule ? '스케줄 수정' : '스케줄 추가'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {scheduleEntries.map((entry, index) => (
              <ScheduleEntryForm
                key={index}
                entry={entry}
                index={index}
                projects={myActiveProjects}
                onUpdate={onUpdateEntry}
                onRemove={onRemoveEntry}
              />
            ))}
          </div>

          {/* 항목 추가 버튼 */}
          {!editingSchedule && (
            <button
              onClick={onAddEntry}
              className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              프로젝트 추가
            </button>
          )}

          {/* 총 시간 표시 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">총 업무 시간</div>
            <div className="text-2xl font-bold text-blue-700">
              {totalHours}시간 {totalMins}분
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export { ScheduleEntryForm } from './ScheduleEntryForm';
