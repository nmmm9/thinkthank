'use client';

import type { DragPreviewState } from '../types';
import type { Project, Schedule } from '@/lib/supabase/database.types';

interface DragPreviewProps {
  dragPreview: DragPreviewState | null;
  dragScheduleId: string | null;
  schedules: Schedule[];
  projects: Project[];
}

export function DragPreview({
  dragPreview,
  dragScheduleId,
  schedules,
  projects,
}: DragPreviewProps) {
  if (!dragPreview || !dragScheduleId) return null;

  const schedule = schedules.find((s) => s.id === dragScheduleId);
  const project = schedule ? projects.find((p) => p.id === schedule.project_id) : null;

  return (
    <div
      className="fixed rounded-lg shadow-lg z-50 pointer-events-none"
      style={{
        top: dragPreview.top,
        left: dragPreview.left,
        width: dragPreview.width,
        height: dragPreview.height,
        backgroundColor: '#3b82f6',
        opacity: 0.9,
      }}
    >
      <div className="p-2 text-white h-full overflow-hidden">
        <div className="text-sm font-semibold truncate">
          {project?.name || '기타'}
        </div>
        <div className="text-xs font-medium mt-1 opacity-90">
          {dragPreview.startTime} - {dragPreview.endTime}
        </div>
      </div>
    </div>
  );
}
