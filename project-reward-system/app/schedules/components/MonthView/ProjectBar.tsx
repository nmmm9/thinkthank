'use client';

import { format } from 'date-fns';
import type { Project } from '@/lib/supabase/database.types';
import type { ColorInfo, ProjectBar as ProjectBarType } from '../../types';

interface ProjectBarProps {
  project: Project;
  bars: ProjectBarType[];
  color: ColorInfo & { isCustom?: boolean };
  layer: number;
}

export function ProjectBar({ project, bars, color, layer }: ProjectBarProps) {
  const barHeight = 1.25;

  return (
    <>
      {bars.map((bar, barIdx) => (
        <div
          key={`${project.id}-${barIdx}`}
          className={`absolute ${color.bg || ''} rounded px-2 py-0.5 text-xs font-medium ${color.text} shadow-sm pointer-events-auto cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
          style={{
            top: `${bar.row * 6.5 + 1.75 + layer * barHeight}rem`,
            left: `${bar.col * 14.285}%`,
            width: `${bar.width * 14.285}%`,
            height: `${barHeight}rem`,
            zIndex: 10 + layer,
            ...(color.hex ? { backgroundColor: color.hex } : {}),
          }}
          title={`${project.name}\n${format(new Date(project.start_date), 'yyyy/MM/dd')} ~ ${format(new Date(project.end_date), 'yyyy/MM/dd')}`}
        >
          {barIdx === 0 && (
            <div className="truncate leading-tight">{project.name}</div>
          )}
        </div>
      ))}
    </>
  );
}
