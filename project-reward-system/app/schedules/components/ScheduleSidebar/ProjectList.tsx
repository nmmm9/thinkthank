'use client';

import type { Project } from '@/lib/supabase/database.types';
import type { ColorInfo } from '../../types';

interface ProjectListProps {
  myActiveProjects: Project[];
  completedProjects: Project[];
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  memberId: string | undefined;
}

export function ProjectList({
  myActiveProjects,
  completedProjects,
  getMemberColor,
  memberId,
}: ProjectListProps) {
  return (
    <>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">진행중인 프로젝트</h3>
      {myActiveProjects.length > 0 ? (
        <div className="space-y-1 mb-4">
          {myActiveProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getMemberColor(memberId || '').hex }}
              />
              <span className="flex-1 text-gray-900 truncate text-xs">
                {project.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-4">진행중인 프로젝트가 없습니다</p>
      )}

      {completedProjects.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">마감된 프로젝트</h3>
          <div className="space-y-1 mb-4">
            {completedProjects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-2 text-sm p-2 rounded-lg opacity-60"
              >
                <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                <span className="flex-1 text-gray-500 truncate text-xs">
                  {project.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
