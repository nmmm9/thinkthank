'use client';

import { Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  scheduleId: string | null;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ scheduleId, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!scheduleId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">스케줄 삭제</h3>
          <p className="text-gray-600">이 스케줄을 삭제하시겠습니까?</p>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(scheduleId)}
            className="flex-1 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium border-l border-gray-100"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
