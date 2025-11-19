'use client';

import { useState, useMemo } from 'react';
import { projects, teams, schedules } from '@/mocks/data';
import { useAuthStore } from '@/lib/auth-store';
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
  const { user } = useAuthStore();
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

  // 특정 날짜에 특정 사용자가 특정 프로젝트에 투입한 시간의 퍼센트 계산
  const getDailyProjectPercentage = (projectId: string, date: Date, userId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // 해당 날짜의 해당 사용자의 모든 스케줄
    const daySchedules = schedules.filter(
      (s) => s.memberId === userId && s.date === dateStr
    );

    // 해당 날짜의 총 투입 시간
    const totalMinutes = daySchedules.reduce((sum, s) => sum + s.minutes, 0);

    if (totalMinutes === 0) return 0;

    // 해당 프로젝트에 투입한 시간
    const projectMinutes = daySchedules
      .filter((s) => s.projectId === projectId)
      .reduce((sum, s) => sum + s.minutes, 0);

    // 퍼센트 계산
    return Math.round((projectMinutes / totalMinutes) * 100);
  };

  // 특정 날짜에 사용자가 작업한 프로젝트 목록
  const getDayProjects = (date: Date, userId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedules = schedules.filter(
      (s) => s.memberId === userId && s.date === dateStr && s.minutes > 0
    );

    return daySchedules.map((s) => s.projectId);
  };

  // 프로젝트를 여러 행으로 나누는 함수 (각 주마다 별도의 바)
  const getProjectBars = (project: typeof projects[0], displayDays: Date[]) => {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    const firstDay = displayDays[0];
    const lastDay = displayDays[displayDays.length - 1];

    if (endDate < firstDay || startDate > lastDay) {
      return [];
    }

    const actualStart = startDate < firstDay ? firstDay : startDate;
    const actualEnd = endDate > lastDay ? lastDay : endDate;

    const bars = [];
    let currentDate = actualStart;

    while (currentDate <= actualEnd) {
      const dayIndex = differenceInDays(currentDate, firstDay);
      const rowIndex = Math.floor((dayIndex + monthStart.getDay()) / 7);
      const colInRow = (dayIndex + monthStart.getDay()) % 7;

      // 이 행의 마지막 날까지 또는 프로젝트 종료일까지
      const daysLeftInRow = 7 - colInRow;
      const daysLeftInProject = differenceInDays(actualEnd, currentDate) + 1;
      const barWidth = Math.min(daysLeftInRow, daysLeftInProject);

      bars.push({
        row: rowIndex,
        col: colInRow,
        width: barWidth,
        startDate: currentDate,
      });

      // 다음 행의 시작으로 이동
      currentDate = addDays(currentDate, barWidth);
    }

    return bars;
  };

  // 각 날짜별로 프로젝트를 레이어(층)로 배치
  const getProjectLayer = (project: typeof projects[0], barStartDate: Date, visibleProjectsList: typeof projects) => {
    const dateStr = format(barStartDate, 'yyyy-MM-dd');

    // 해당 날짜에 시작하는 다른 프로젝트들 찾기
    const projectsOnSameDay = visibleProjectsList.filter((p) => {
      const pStart = new Date(p.startDate);
      const pEnd = new Date(p.endDate);
      return barStartDate >= pStart && barStartDate <= pEnd;
    });

    // 현재 프로젝트의 인덱스 반환 (레이어로 사용)
    return projectsOnSameDay.findIndex((p) => p.id === project.id);
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
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayProjects = user ? getDayProjects(day, user.id) : [];

                  return (
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

                      {/* 세로 막대 그래프 - 위에서 아래로 */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="relative w-full h-[500px] bg-gray-50 rounded-lg border border-gray-200 flex flex-col">
                          {/* 8시간(480분) = 100% */}
                          {user &&
                            dayProjects.map((projectId, idx) => {
                              if (!visibleProjects[projectId]) return null;

                              const project = projects.find((p) => p.id === projectId);
                              if (!project) return null;

                              const daySchedule = schedules.find(
                                (s) => s.memberId === user.id && s.date === dateStr && s.projectId === projectId
                              );
                              const minutes = daySchedule?.minutes || 0;
                              const percentage = (minutes / 480) * 100; // 480분 = 8시간
                              const hours = Math.floor(minutes / 60);
                              const mins = minutes % 60;

                              return (
                                <div
                                  key={projectId}
                                  className={`w-full ${getProjectColor(
                                    projectId
                                  )} border-b border-gray-300 relative group cursor-pointer transition-all hover:brightness-95`}
                                  style={{
                                    height: `${percentage}%`,
                                  }}
                                >
                                  {/* 퍼센트 표시 */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-2xl font-bold text-gray-900">
                                      {Math.round(percentage)}%
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {hours > 0 && `${hours}시간`}
                                      {mins > 0 && ` ${mins}분`}
                                    </div>
                                  </div>

                                  {/* 툴팁 (호버 시) */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-10">
                                    <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                                      <div className="font-medium mb-1">{project.name}</div>
                                      <div>
                                        {hours > 0 && `${hours}시간 `}
                                        {mins > 0 && `${mins}분`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

                  {/* 프로젝트 바 (절대 위치) - 여러 행으로 나뉨 */}
                  <div className="absolute top-0 left-0 right-0 pointer-events-none">
                    {activeProjects
                      .filter((p) => visibleProjects[p.id])
                      .map((project, projectIdx) => {
                        const bars = getProjectBars(project, calendarDays);
                        if (bars.length === 0) return null;

                        const visibleProjectsList = activeProjects.filter((p) => visibleProjects[p.id]);

                        return bars.map((bar, barIdx) => {
                          const layer = getProjectLayer(project, bar.startDate, visibleProjectsList);
                          const barHeight = 1.5; // rem 단위

                          return (
                            <div
                              key={`${project.id}-${barIdx}`}
                              className={`absolute ${getProjectColor(
                                project.id
                              )} rounded px-2 py-0.5 text-xs font-medium shadow-sm border border-gray-300 pointer-events-auto cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                              style={{
                                top: `${bar.row * 7 + 2 + layer * barHeight}rem`,
                                left: `${bar.col * 14.285}%`,
                                width: `${bar.width * 14.285}%`,
                                height: `${barHeight}rem`,
                                zIndex: 10 + layer,
                              }}
                              title={`${project.name}\n${format(
                                new Date(project.startDate),
                                'yyyy/MM/dd'
                              )} ~ ${format(new Date(project.endDate), 'yyyy/MM/dd')}`}
                            >
                              {/* 첫 번째 바에만 프로젝트명 표시 */}
                              {barIdx === 0 && (
                                <div className="truncate leading-tight">{project.name}</div>
                              )}
                            </div>
                          );
                        });
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
