'use client';

import { useState, useMemo } from 'react';
import { projects, teams } from '@/mocks/data';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  differenceInDays,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function SchedulesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [visibleProjects, setVisibleProjects] = useState<Record<string, boolean>>(
    projects.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 프로젝트 색상 배정
  const projectColors = [
    'bg-orange-200',
    'bg-yellow-200',
    'bg-purple-200',
    'bg-pink-200',
    'bg-green-200',
    'bg-blue-200',
    'bg-indigo-200',
  ];

  const getProjectColor = (projectId: string) => {
    const index = projects.findIndex((p) => p.id === projectId);
    return projectColors[index % projectColors.length];
  };

  const activeProjects = useMemo(() => {
    return projects.filter((p) => {
      const end = new Date(p.endDate);
      return end >= new Date();
    });
  }, []);

  const completedProjects = useMemo(() => {
    return projects.filter((p) => {
      const end = new Date(p.endDate);
      return end < new Date();
    });
  }, []);

  const toggleProjectVisibility = (projectId: string) => {
    setVisibleProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const calculateProgress = (project: typeof projects[0]) => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();

    if (today < start) return 0;
    if (today > end) return 100;

    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);

    return Math.round((elapsed / total) * 100);
  };

  const getProjectPosition = (project: typeof projects[0], displayDays: Date[]) => {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    const firstDay = displayDays[0];
    const lastDay = displayDays[displayDays.length - 1];

    if (endDate < firstDay || startDate > lastDay) {
      return null;
    }

    const startCol = Math.max(0, differenceInDays(startDate, firstDay));
    const endCol = Math.min(displayDays.length - 1, differenceInDays(endDate, firstDay));
    const width = endCol - startCol + 1;

    return { startCol, width };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 왼쪽 사이드바 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* 달력 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'M월', { locale: ko })}{' '}
              <span className="text-gray-400">{format(currentDate, 'yyyy')}</span>
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

          <div className="grid grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={idx} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}

            {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {calendarDays.map((day) => {
              const hasProject = projects.some((p) => {
                const start = new Date(p.startDate);
                const end = new Date(p.endDate);
                return day >= start && day <= end;
              });

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors cursor-pointer ${
                    isToday(day)
                      ? 'bg-blue-500 text-white font-bold'
                      : hasProject
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentDate(day)}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>

          {isSameMonth(currentDate, new Date()) && (
            <p className="text-xs text-red-500 mt-2">• 임박한일정 날짜가 있어요</p>
          )}
        </div>

        {/* 진행 중인 프로젝트 */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">진행 중인 프로젝트</h3>
          <div className="space-y-2">
            {activeProjects.map((project) => {
              const progress = calculateProgress(project);
              return (
                <div
                  key={project.id}
                  className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
                  onClick={() => toggleProjectVisibility(project.id)}
                >
                  <div className={`w-3 h-3 rounded-full ${getProjectColor(project.id)}`} />
                  <span className="flex-1 text-gray-900 truncate">{project.name}</span>
                  <button className="flex-shrink-0">
                    {visibleProjects[project.id] ? (
                      <Eye className="w-4 h-4 text-gray-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-300" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">종료된 프로젝트</h3>
          <div className="space-y-2">
            {completedProjects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
                onClick={() => toggleProjectVisibility(project.id)}
              >
                <div className={`w-3 h-3 rounded-full ${getProjectColor(project.id)}`} />
                <span className="flex-1 text-gray-500 truncate">{project.name}</span>
                <button className="flex-shrink-0">
                  {visibleProjects[project.id] ? (
                    <Eye className="w-4 h-4 text-gray-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 타임라인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">스케줄</h1>
              <p className="text-sm text-gray-600">등록된 프로젝트에 대한 스케줄 목록입니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                참여자수 입력
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                프로젝트 스케줄 확인
              </button>
            </div>
          </div>
        </div>

        {/* 타임라인 컨텐츠 */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'week' ? (
            // 주간 뷰 (세로 바)
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentDate(addDays(currentDate, -7))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(addDays(currentDate, 7))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-4">
                {weekDays.map((day) => (
                  <div key={format(day, 'yyyy-MM-dd')} className="flex flex-col">
                    {/* 날짜 헤더 */}
                    <div className="text-center mb-3 pb-3 border-b border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">
                        {format(day, 'EEE', { locale: ko })} {format(day, 'd')}
                      </div>
                      {isToday(day) && (
                        <div className="text-xs text-blue-600 font-medium">오늘</div>
                      )}
                    </div>

                    {/* 프로젝트 바 */}
                    <div className="relative flex-1 min-h-[400px] flex flex-col gap-2">
                      {activeProjects
                        .filter((p) => visibleProjects[p.id])
                        .map((project) => {
                          const start = new Date(project.startDate);
                          const end = new Date(project.endDate);

                          if (day < start || day > end) return null;

                          const progress = calculateProgress(project);
                          const team = teams.find((t) => t.id === project.teamId);

                          return (
                            <div
                              key={project.id}
                              className={`${getProjectColor(
                                project.id
                              )} rounded-lg p-3 shadow-sm border border-gray-300`}
                            >
                              <div className="text-xs font-medium text-gray-900 mb-1 truncate">
                                {project.name}
                              </div>
                              <div className="text-xs text-gray-600 mb-2 truncate">
                                {team?.name || '팀 없음'}
                              </div>
                              <div className="text-2xl font-bold text-gray-900 mb-1">
                                {progress}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(start, 'M/d')} ~ {format(end, 'M/d')}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 월간 뷰 (가로 바)
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {format(currentDate, 'M월', { locale: ko })}{' '}
                    <span className="text-gray-400">{format(currentDate, 'yyyy')}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentDate(addDays(currentDate, -30))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(addDays(currentDate, 30))}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={idx} className="text-center text-sm font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 달력 그리드 */}
                <div className="relative">
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="h-24 bg-gray-50 rounded-lg" />
                    ))}

                    {calendarDays.map((day) => (
                      <div
                        key={format(day, 'yyyy-MM-dd')}
                        className={`h-24 rounded-lg border ${
                          isToday(day)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                        } p-1`}
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 프로젝트 바 (절대 위치) */}
                  <div className="absolute top-0 left-0 right-0 pointer-events-none">
                    {activeProjects
                      .filter((p) => visibleProjects[p.id])
                      .map((project, idx) => {
                        const position = getProjectPosition(project, calendarDays);
                        if (!position) return null;

                        const rowStart = Math.floor(
                          (position.startCol + monthStart.getDay()) / 7
                        );
                        const team = teams.find((t) => t.id === project.teamId);

                        return (
                          <div
                            key={project.id}
                            className={`absolute ${getProjectColor(
                              project.id
                            )} rounded px-2 py-1 text-xs font-medium shadow-sm border border-gray-300 pointer-events-auto cursor-pointer hover:shadow-md transition-shadow`}
                            style={{
                              top: `${rowStart * 6 + 2}rem`,
                              left: `${((position.startCol + monthStart.getDay()) % 7) * 14.285}%`,
                              width: `${position.width * 14.285}%`,
                              zIndex: 10 + idx,
                            }}
                            title={`${project.name}\n${format(
                              new Date(project.startDate),
                              'yyyy/MM/dd'
                            )} ~ ${format(new Date(project.endDate), 'yyyy/MM/dd')}`}
                          >
                            <div className="truncate">{project.name}</div>
                            <div className="text-xs text-gray-600 truncate">
                              {format(new Date(project.startDate), 'M/d')} ~{' '}
                              {format(new Date(project.endDate), 'M/d')}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
