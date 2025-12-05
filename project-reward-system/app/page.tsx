'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { getProjects, getSchedules, getMembers, getOpexList, toggleProjectStar } from '@/lib/api';
import type { Project, Schedule, Member, Opex } from '@/lib/supabase/database.types';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, format, eachDayOfInterval, isToday, differenceInDays, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowRight, Star } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

// 확장된 프로젝트 타입 (관계 데이터 포함)
interface ProjectWithRelations extends Project {
  category?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  allocations?: Array<{
    member_id: string;
    balance_percent: number;
    member?: { id: string; name: string } | null;
  }>;
}

// 확장된 스케줄 타입
interface ScheduleWithRelations extends Schedule {
  project?: Project | null;
  member?: Member | null;
}

export default function Dashboard() {
  const { member } = useAuthStore();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithRelations[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // 달력용 월 시작/끝
  const calendarMonthStart = startOfMonth(calendarDate);
  const calendarMonthEnd = endOfMonth(calendarDate);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [projectsData, schedulesData, membersData, opexData] = await Promise.all([
          getProjects(),
          getSchedules(),
          getMembers(),
          getOpexList(),
        ]);

        setProjects(projectsData as ProjectWithRelations[]);
        setSchedules(schedulesData as ScheduleWithRelations[]);
        setMembers(membersData as Member[]);
        setOpexes(opexData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 성과 계산 함수
  const calculatePerformance = useCallback((startDate: Date, endDate: Date) => {
    let totalRevenue = 0;
    let totalCost = 0;

    projects.forEach((project) => {
      const projectStart = new Date(project.start_date);
      const projectEnd = new Date(project.end_date);

      if (
        isWithinInterval(projectStart, { start: startDate, end: endDate }) ||
        isWithinInterval(projectEnd, { start: startDate, end: endDate }) ||
        (projectStart <= startDate && projectEnd >= endDate)
      ) {
        totalRevenue += project.contract_amount;
      }
    });

    schedules.forEach((schedule) => {
      const scheduleDate = new Date(schedule.date);
      if (isWithinInterval(scheduleDate, { start: startDate, end: endDate })) {
        const member = members.find((m) => m.id === schedule.member_id);
        if (member) {
          const hours = schedule.minutes / 60;

          const dailyCost = member.annual_salary / (12 * 20.917);
          const yearMonth = format(scheduleDate, 'yyyy-MM');
          const memberOpex = opexes.find((o) => o.year_month === yearMonth);
          const opexAmount = memberOpex ? memberOpex.amount : 0;
          const dailyOpex = opexAmount / 20.917;
          const dailyTotal = dailyCost + dailyOpex;

          totalCost += (dailyTotal * hours) / 8;
        }
      }
    });

    const profit = totalRevenue - totalCost;
    const profitRate = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, profit, profitRate };
  }, [projects, schedules, members, opexes]);

  // 올해 총 매출 계산
  const yearlyRevenue = useMemo(() => {
    const yearStart = startOfYear(today);
    const yearEnd = endOfYear(today);

    return projects
      .filter((project) => {
        const projectEnd = new Date(project.end_date);
        // 올해 종료된 프로젝트 (완료된 프로젝트의 계약금 합계)
        return project.status === 'completed' &&
               projectEnd >= yearStart &&
               projectEnd <= yearEnd;
      })
      .reduce((sum, project) => sum + project.contract_amount, 0);
  }, [projects, today]);

  const monthPerformance = useMemo(() => {
    return calculatePerformance(monthStart, monthEnd);
  }, [monthStart, monthEnd, calculatePerformance]);

  const totalPerformance = useMemo(() => {
    const allDates = [...projects.map((p) => new Date(p.start_date)), ...schedules.map((s) => new Date(s.date))];
    if (allDates.length === 0) return { totalRevenue: 0, totalCost: 0, profit: 0, profitRate: 0 };

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    return calculatePerformance(minDate, maxDate);
  }, [projects, schedules, calculatePerformance]);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarMonthStart, end: calendarMonthEnd });
  }, [calendarMonthStart, calendarMonthEnd]);

  // 내가 참여 중인 프로젝트 (allocations에 내 member_id가 있는 프로젝트)
  const myProjects = useMemo(() => {
    if (!member?.id) return [];
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      const isActive = end >= today;
      const isMyProject = p.allocations?.some((a: any) => a.member_id === member.id);
      return isActive && isMyProject;
    });
  }, [projects, today, member?.id]);

  // 즐겨찾기 프로젝트
  const starredProjects = useMemo(() => {
    return projects
      .filter((p) => p.starred)
      .map((project) => {
        const start = new Date(project.start_date);
        const end = new Date(project.end_date);
        const total = differenceInDays(end, start);
        const elapsed = differenceInDays(today, start);
        const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
        const remainingDays = differenceInDays(end, today);

        return { ...project, progress, remainingDays };
      });
  }, [projects, today]);

  // 즐겨찾기 토글
  const handleToggleStar = async (projectId: string, currentStarred: boolean) => {
    try {
      await toggleProjectStar(projectId, !currentStarred);
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, starred: !currentStarred } : p
      ));
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
    }
  };

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

  const avgPerformanceRate = Math.round((monthPerformance.profitRate + totalPerformance.profitRate) / 2);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

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
          {/* 올해의 총 매출 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">올해의 총 매출</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600">{today.getFullYear()}년</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {yearlyRevenue.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">원</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">완료된 프로젝트 기준</span>
                <span className="text-xs text-blue-600 font-medium">
                  {projects.filter(p => p.status === 'completed').length}개 프로젝트
                </span>
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
      <div className="flex gap-6 mb-8 items-stretch">
        {/* 스케줄 - 정사각형 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 w-[520px] flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 mb-3">스케줄</h2>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                {format(calendarDate, 'M월', { locale: ko })} <span className="text-gray-400 text-xs">{format(calendarDate, 'yyyy')}</span>
              </h3>
              <div className="flex items-center gap-1">
                <button
                  className="p-0.5 hover:bg-gray-100 rounded"
                  onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                >
                  <span className="text-gray-600 text-sm">‹</span>
                </button>
                <button
                  className="p-0.5 hover:bg-gray-100 rounded"
                  onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                >
                  <span className="text-gray-600 text-sm">›</span>
                </button>
              </div>
            </div>

            {/* 달력 */}
            <div className="grid grid-cols-7 gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={idx} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}

              {Array.from({ length: calendarMonthStart.getDay() }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square" />
              ))}

              {calendarDays.map((day) => {
                // 본인 스케줄만 필터링
                const daySchedules = schedules.filter((s) => {
                  const scheduleDate = new Date(s.date);
                  return s.member_id === member?.id && format(scheduleDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                });

                const hasSchedule = daySchedules.length > 0;
                const dayNum = format(day, 'd');

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className="aspect-square flex items-center justify-center cursor-pointer"
                    onClick={() => router.push(`/schedules?date=${format(day, 'yyyy-MM-dd')}`)}
                  >
                    <div
                      className={`w-[70%] h-[70%] flex items-center justify-center text-xs rounded-md transition-colors ${
                        isToday(day)
                          ? 'bg-blue-500 text-white font-bold'
                          : hasSchedule
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {dayNum}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 팀 최신 프로젝트 - 나머지 공간 채우기 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">내가 참여 중인 프로젝트</h2>
            <button onClick={() => router.push('/projects')} className="hover:bg-gray-100 rounded-full p-1 transition-colors">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* 테이블 헤더 */}
          <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-100 mb-2">
            <div className="col-span-3 text-xs font-medium text-gray-500">프로젝트명</div>
            <div className="col-span-2 text-xs font-medium text-gray-500">현황</div>
            <div className="col-span-2 text-xs font-medium text-gray-500">남은기간</div>
            <div className="col-span-5 text-xs font-medium text-gray-500">실행율</div>
          </div>

          <div className="space-y-1">
            {myProjects.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">참여 중인 프로젝트가 없습니다.</p>
            ) : (
              myProjects.slice(0, 8).map((project) => {
                const start = new Date(project.start_date);
                const end = new Date(project.end_date);
                const total = differenceInDays(end, start);
                const elapsed = differenceInDays(today, start);
                const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
                const remainingDays = differenceInDays(end, today);

                const canManageProject = member?.role === 'admin' || member?.role === 'manager';

                return (
                  <div
                    key={project.id}
                    className={`grid grid-cols-12 gap-4 py-2.5 hover:bg-gray-50 rounded-lg transition-colors ${canManageProject ? 'cursor-pointer' : ''}`}
                    onClick={() => canManageProject && router.push(`/projects?edit=${project.id}`)}
                  >
                    {/* 프로젝트명 */}
                    <div className="col-span-3 flex items-center min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </h3>
                    </div>

                    {/* 현황 */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </div>

                    {/* 남은기간 */}
                    <div className="col-span-2 flex items-center">
                      <span className="text-xs text-gray-500">
                        {remainingDays > 0 ? `${remainingDays}일 남음` : remainingDays === 0 ? '오늘 마감' : `${Math.abs(remainingDays)}일 초과`}
                      </span>
                    </div>

                    {/* 실행율 */}
                    <div className="col-span-5 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.round(progress)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-10">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 즐겨찾기 프로젝트 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          즐겨찾기 프로젝트
        </h2>
        {starredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">아직 즐겨찾기를 한 프로젝트가 없어요.</p>
            <p className="text-sm text-gray-500">
              좌측의 프로젝트 탭에서 자주 확인이 필요한 프로젝트를 즐겨찾기로 고정해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {starredProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {project.remainingDays > 0 ? `${project.remainingDays}일 남음` : project.remainingDays === 0 ? '오늘 마감' : `${Math.abs(project.remainingDays)}일 초과`}
                      </span>
                      <span>
                        {format(new Date(project.start_date), 'yyyy/MM/dd')} ~{' '}
                        {format(new Date(project.end_date), 'yyyy/MM/dd')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStar(project.id, project.starred)}
                    className="hover:scale-110 transition-transform"
                  >
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">진행율</span>
                    <span className="text-sm text-gray-600">계약금액</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-gray-900">
                      {Math.round(project.progress)}%
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {project.contract_amount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
