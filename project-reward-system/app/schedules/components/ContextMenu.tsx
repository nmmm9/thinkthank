'use client';

import { Trash2 } from 'lucide-react';
import type { ContextMenuState } from '../types';

interface ContextMenuProps {
  data: ContextMenuState | null;
  onDelete: (scheduleId: string) => void;
  onClose: () => void;
}

export function ContextMenu({ data, onDelete, onClose }: ContextMenuProps) {
  if (!data) return null;

  return (
    <div
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[70] min-w-[120px]"
      style={{
        top: data.y,
        left: data.x,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        onClick={() => {
          onDelete(data.scheduleId);
          onClose();
        }}
      >
        <Trash2 className="w-4 h-4" />
        삭제
      </button>
    </div>
  );
}
