'use client';

import { useMemo, useCallback } from 'react';
import { projects, schedules, members, teams, positions, opexes } from '@/mocks/data';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, format, eachDayOfInterval, isToday, differenceInDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowRight, Star } from 'lucide-react';

export default function Dashboard() {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // 성과 계산 함수
  const calculatePerformance = useCallback((startDate: Date, endDate: Date) => {
    let totalRevenue = 0;
    let totalCost = 0;

    projects.forEach((project) => {
      const projectStart = new Date(project.startDate);
      const projectEnd = new Date(project.endDate);

      if (
        isWithinInterval(projectStart, { start: startDate, end: endDate }) ||
        isWithinInterval(projectEnd, { start: startDate, end: endDate }) ||
        (projectStart <= startDate && projectEnd >= endDate)
      ) {
        totalRevenue += project.contractAmount;
      }
    });

    schedules.forEach((schedule) => {
      const scheduleDate = new Date(schedule.date);
      if (isWithinInterval(scheduleDate, { start: startDate, end: endDate })) {
        const member = members.find((m) => m.id === schedule.memberId);
        if (member) {
          const position = positions.find((p) => p.id === member.positionId);
          const hours = schedule.minutes / 60;

          const dailyCost = member.annualSalary / (12 * 20.917);
          const yearMonth = format(scheduleDate, 'yyyy-MM');
          const memberOpex = opexes.find((o) => o.yearMonth === yearMonth);
          const salaryRatio = position ? 1 : 0;
          const opexAmount = memberOpex ? memberOpex.amount : 0;
          const dailyOpex = (opexAmount * salaryRatio) / 20.917;
          const dailyTotal = dailyCost + dailyOpex;

          totalCost += (dailyTotal * hours) / 8;
        }
      }
    });

    const profit = totalRevenue - totalCost;
    const profitRate = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, profit, profitRate };
  }, []);

  const todayPerformance = useMemo(() => {
    return calculatePerformance(startOfDay(today), endOfDay(today));
  }, [today, calculatePerformance]);

  const monthPerformance = useMemo(() => {
    return calculatePerformance(monthStart, monthEnd);
  }, [monthStart, monthEnd, calculatePerformance]);

  const totalPerformance = useMemo(() => {
    const allDates = [...projects.map((p) => new Date(p.startDate)), ...schedules.map((s) => new Date(s.date))];
    if (allDates.length === 0) return { totalRevenue: 0, totalCost: 0, profit: 0, profitRate: 0 };

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    return calculatePerformance(minDate, maxDate);
  }, [calculatePerformance]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [monthStart, monthEnd]);

  const activeProjects = projects.filter((p) => {
    const end = new Date(p.endDate);
    return end >= today;
  }).slice(0, 5);

  const topProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const end = new Date(p.endDate);
        return end >= today;
      })
      .slice(0, 3)
      .map((project) => {
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const total = differenceInDays(end, start);
        const elapsed = differenceInDays(today, start);
        const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
        const remainingDays = differenceInDays(end, today);

        return { ...project, progress, remainingDays };
      });
  }, [today]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-blue-100 text-blue-700',
      inprogress: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      paused: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: '진행예정',
      inprogress: '진행중',
      completed: '완료',
      paused: '비정상',
    };
    return labels[status] || status;
  };

  const avgPerformanceRate = Math.round((todayPerformance.profitRate + monthPerformance.profitRate + totalPerformance.profitRate) / 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 성과 섹션 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">성과</h1>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">
              전체 프로젝트 성과의 평균 {avgPerformanceRate}%를 달성했어요
            </p>
          </div>
        </div>

        {/* 성과 카드 3개 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 오늘 성과 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">오늘 성과</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600">전체 프로젝트</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {todayPerformance.profit.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">원</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">계약 성과</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">0원</span>
                  <span className="text-xs text-green-600 font-medium">
                    {Math.round(todayPerformance.profitRate)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 이번 달 성과 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">이번 달 성과</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600">전체 프로젝트</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {monthPerformance.profit.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">원</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">계약 성과</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">0원</span>
                  <span className="text-xs text-blue-600 font-medium">
                    {Math.round(monthPerformance.profitRate)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 총액 성과 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">🌐</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">총액 성과</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600">전체 프로젝트</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {totalPerformance.profit.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">원</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">계약 성과</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">0원</span>
                  <span className="text-xs text-purple-600 font-medium">
                    {Math.round(totalPerformance.profitRate)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 스케줄 & 팀 최신 프로젝트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 스케줄 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">스케줄</h2>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-700">
                {format(today, 'M월', { locale: ko })} <span className="text-gray-400">2024</span>
              </h3>
              <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <span className="text-gray-600">‹</span>
                </button>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <span className="text-gray-600">›</span>
                </button>
              </div>
            </div>

            {/* 달력 */}
            <div className="grid grid-cols-7 gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={idx} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}

              {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square" />
              ))}

              {calendarDays.map((day) => {
                const daySchedules = schedules.filter((s) => {
                  const scheduleDate = new Date(s.date);
                  return format(scheduleDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                });

                const hasSchedule = daySchedules.length > 0;
                const dayNum = format(day, 'd');

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                      isToday(day)
                        ? 'bg-blue-500 text-white font-bold'
                        : hasSchedule
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 팀 최신 프로젝트 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">팀 최신 프로젝트</h2>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {activeProjects.map((project) => {
              const start = new Date(project.startDate);
              const end = new Date(project.endDate);
              const total = differenceInDays(end, start);
              const elapsed = differenceInDays(today, start);
              const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);

              return (
                <div key={project.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {format(start, 'MM.dd')} ~ {format(end, 'MM.dd')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.round(progress)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8 text-right">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 3개 프로젝트 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {topProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {project.remainingDays}일
                  </span>
                  <span>
                    {format(new Date(project.startDate), 'yyyy/MM/dd')} ~{' '}
                    {format(new Date(project.endDate), 'yyyy/MM/dd')}
                  </span>
                </div>
              </div>
              <Star className="w-5 h-5 text-blue-500" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">성과율</span>
                <span className="text-sm text-gray-600">프로젝트 성과</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-900">
                  {Math.round(project.progress)}%
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {project.contractAmount.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
