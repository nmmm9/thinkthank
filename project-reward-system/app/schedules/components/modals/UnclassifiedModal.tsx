'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, AlertCircle, Calendar } from 'lucide-react';
import type { Schedule, Project } from '@/lib/supabase/database.types';

interface UnclassifiedModalProps {
  isOpen: boolean;
  schedules: Schedule[];
  myActiveProjects: Project[];
  onClose: () => void;
  onAssignProject: (scheduleId: string, projectId: string) => Promise<void>;
}

export function UnclassifiedModal({
  isOpen,
  schedules,
  myActiveProjects,
  onClose,
  onAssignProject,
}: UnclassifiedModalProps) {
  const [assigningScheduleId, setAssigningScheduleId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAssign = async (scheduleId: string, projectId: string) => {
    if (projectId) {
      await onAssignProject(scheduleId, projectId);
      setAssigningScheduleId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">미분류 스케줄</h2>
                <p className="text-amber-100 text-sm">프로젝트를 지정해주세요</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 스케줄 목록 */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              미분류 스케줄이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(schedule.date), 'M월 d일 (EEE)', { locale: ko })}</span>
                        {(schedule as any).start_time && (
                          <span>
                            {(schedule as any).start_time} - {(schedule as any).end_time}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium">
                        {(schedule as any).description || '설명 없음'}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {assigningScheduleId === schedule.id ? (
                        <select
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          onChange={(e) => handleAssign(schedule.id, e.target.value)}
                          onBlur={() => setAssigningScheduleId(null)}
                          autoFocus
                        >
                          <option value="">프로젝트 선택</option>
                          {myActiveProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setAssigningScheduleId(schedule.id)}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                        >
                          프로젝트 지정
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
