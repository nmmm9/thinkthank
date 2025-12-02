'use client';

import { useState, useMemo, useEffect } from 'react';
import { getProjects, getTeams, getMembers, getOpexList, getSchedules, getPositions } from '@/lib/api';
import type { Project, Team, Schedule, Position, Opex, MemberWithRelations } from '@/lib/supabase/database.types';
import { ChevronDown, ChevronRight, Users as UsersIcon, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { getWorkingDaysInMonth, getYearMonthFromDate } from '@/lib/utils/workdays';

export default function PerformancePage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, teamsData, membersData, opexData, schedulesData] = await Promise.all([
          getProjects(),
          getTeams(),
          getMembers(),
          getOpexList(),
          getSchedules(),
        ]);
        setProjects(projectsData);
        setTeams(teamsData);
        setMembers(membersData);
        setOpexes(opexData);
        setSchedules(schedulesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 프로젝트 펼치기/접기
  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // 성과 계산 (새로운 공식)
  // 1. 판관비 = 운영비 - 전체 월급 합계
  // 2. 1인 판관비 = 판관비 × (개인연봉 / 전체연봉) / 해당월 근무일수
  // 3. 1일 매출원가 = 연봉 / 12 / 해당월 근무일수
  const calculateMemberPerformance = (memberId: string, projectId: string) => {
    const member = members.find((m) => m.id === memberId);
    const project = projects.find((p) => p.id === projectId);

    if (!member || !project) return null;

    // 해당 멤버의 프로젝트 스케줄
    const memberSchedules = schedules.filter(
      (s) => s.member_id === memberId && s.project_id === projectId
    );

    if (memberSchedules.length === 0) {
      // 스케줄이 없으면 기본값 반환
      const allocation = project.member_allocations?.find((a: any) => a.member_id === memberId);
      const memberContractAmount = allocation
        ? (project.contract_amount * allocation.balance_percent) / 100
        : 0;

      return {
        memberName: member.name,
        memberContractAmount,
        dailyCost: 0,
        dailyOpex: 0,
        dailyTotalCost: 0,
        actualDays: 0,
        totalInvestment: 0,
        performance: Math.round(memberContractAmount),
        participationRate: allocation?.balance_percent || 0,
      };
    }

    // 활성 멤버들의 총 연봉
    const activeMembers = members.filter((m) => m.is_active && m.is_approved);
    const totalAnnualSalary = activeMembers.reduce((sum, m) => sum + m.annual_salary, 0);

    // 월별 총 월급 (연봉 / 12)
    const totalMonthlySalary = totalAnnualSalary / 12;

    // 개인 연봉 비중
    const salaryRatio = totalAnnualSalary > 0 ? member.annual_salary / totalAnnualSalary : 0;

    // 월별로 비용 계산 후 합산
    // 스케줄을 월별로 그룹화
    const schedulesByMonth: { [yearMonth: string]: { minutes: number } } = {};
    memberSchedules.forEach((s) => {
      const yearMonth = getYearMonthFromDate(s.date);
      if (!schedulesByMonth[yearMonth]) {
        schedulesByMonth[yearMonth] = { minutes: 0 };
      }
      schedulesByMonth[yearMonth].minutes += s.minutes;
    });

    let totalDailyCost = 0;
    let totalDailyOpex = 0;
    let totalActualDays = 0;
    let totalInvestment = 0;

    // 각 월별로 계산
    Object.entries(schedulesByMonth).forEach(([yearMonth, data]) => {
      const [year, month] = yearMonth.split('-').map(Number);
      const workingDaysInMonth = getWorkingDaysInMonth(year, month);

      // 해당 월의 운영비 찾기
      const monthOpex = opexes.find((o) => o.year_month === yearMonth);
      const opexAmount = monthOpex?.amount || opexes[0]?.amount || 16000000;

      // 판관비 = 운영비 - 전체 월급
      const adminExpense = Math.max(0, opexAmount - totalMonthlySalary);

      // 1일 1인 판관비 = 판관비 × 연봉비중 / 해당월 근무일수
      const dailyOpex = workingDaysInMonth > 0
        ? (adminExpense * salaryRatio) / workingDaysInMonth
        : 0;

      // 1일 매출원가 = 연봉 / 12 / 해당월 근무일수
      const dailyCost = workingDaysInMonth > 0
        ? (member.annual_salary / 12) / workingDaysInMonth
        : 0;

      // 1일 투입비
      const dailyTotalCost = dailyCost + dailyOpex;

      // 해당 월의 참여일수 (분 → 일)
      const daysInMonth = data.minutes / 480;

      // 해당 월의 투입비용
      const monthInvestment = dailyTotalCost * daysInMonth;

      // 누적
      totalDailyCost += dailyCost * daysInMonth;
      totalDailyOpex += dailyOpex * daysInMonth;
      totalActualDays += daysInMonth;
      totalInvestment += monthInvestment;
    });

    // 평균 1일 비용 계산 (표시용)
    const avgDailyCost = totalActualDays > 0 ? totalDailyCost / totalActualDays : 0;
    const avgDailyOpex = totalActualDays > 0 ? totalDailyOpex / totalActualDays : 0;
    const avgDailyTotalCost = avgDailyCost + avgDailyOpex;

    // 팀원 계약금 (배분 비율에 따라)
    const allocation = project.member_allocations?.find((a: any) => a.member_id === memberId);
    const memberContractAmount = allocation
      ? (project.contract_amount * allocation.balance_percent) / 100
      : 0;

    // 성과
    const performance = memberContractAmount - totalInvestment;

    return {
      memberName: member.name,
      memberContractAmount,
      dailyCost: Math.round(avgDailyCost),
      dailyOpex: Math.round(avgDailyOpex),
      dailyTotalCost: Math.round(avgDailyTotalCost),
      actualDays: Math.round(totalActualDays * 10) / 10,
      totalInvestment: Math.round(totalInvestment),
      performance: Math.round(performance),
      participationRate: allocation?.balance_percent || 0,
    };
  };

  // 프로젝트별 성과 계산
  const projectPerformances = useMemo(() => {
    return projects.map((project) => {
      const allocations = project.member_allocations || [];
      const memberPerfs = allocations
        .map((allocation: any) => calculateMemberPerformance(allocation.member_id, project.id))
        .filter((p) => p !== null);

      const projectTotal = memberPerfs.reduce((sum, p) => sum + p.memberContractAmount, 0);
      const teamTotal = memberPerfs.reduce((sum, p) => sum + p.totalInvestment, 0);
      const performanceTotal = memberPerfs.reduce((sum, p) => sum + p.performance, 0);

      return {
        project,
        memberPerfs,
        projectTotal,
        teamTotal,
        performanceTotal,
      };
    });
  }, [projects, members, schedules, opexes]);

  // 전체 성과 합계
  const totalPerformance = useMemo(() => {
    return projectPerformances.reduce((sum, p) => sum + p.performanceTotal, 0);
  }, [projectPerformances]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">성과</h1>
        <p className="text-sm text-gray-600">프로젝트에 대한 성과를 확인합니다.</p>
      </div>

      {/* 연도 및 총 성과 */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">{selectedYear}년</h2>
              <p className="text-sm text-gray-600">브랜드 디자인팀 성과 합계</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">2024년 브랜드 디자인팀 성과 합계</div>
              <div className="text-3xl font-bold text-gray-900">
                {totalPerformance.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="px-6 space-y-4">
        {projectPerformances.map(({ project, memberPerfs, projectTotal, teamTotal, performanceTotal }) => {
          const isExpanded = expandedProjects[project.id];
          const team = teams.find((t) => t.id === project.team_id);

          return (
            <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 프로젝트 헤더 */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                onClick={() => toggleProject(project.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button className="text-gray-600">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">
                        {team?.name || '팀 없음'} • {format(new Date(project.start_date), 'yyyy.MM.dd')} ~{' '}
                        {format(new Date(project.end_date), 'yyyy.MM.dd')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {performanceTotal.toLocaleString()}원
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    계약금 {projectTotal.toLocaleString()}원
                  </div>
                </div>
              </div>

              {/* 프로젝트 상세 (펼쳤을 때) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* 프로젝트 요약 */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">프로젝트 총액</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {projectTotal.toLocaleString()}원
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <UsersIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">팀 총액</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {teamTotal.toLocaleString()}원
                      </div>
                    </div>
                  </div>

                  {/* 팀원별 상세 테이블 */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">팀원 계약금</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">참여비율</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">1일 매출원가</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">1일 판관리비</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">1일 투입비</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">참여일수</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">총 투입비</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700 bg-blue-50">
                            성과
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {memberPerfs.map((perf, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {perf.memberName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{perf.memberName}</div>
                                  <div className="text-xs text-gray-500">
                                    {perf.memberContractAmount.toLocaleString()}원
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                {perf.participationRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {perf.dailyCost.toLocaleString()}원
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {perf.dailyOpex.toLocaleString()}원
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {perf.dailyTotalCost.toLocaleString()}원
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">
                              {perf.actualDays}일
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {perf.totalInvestment.toLocaleString()}원
                            </td>
                            <td className="px-4 py-3 text-right font-bold bg-blue-50">
                              <span
                                className={
                                  perf.performance >= 0 ? 'text-blue-600' : 'text-red-600'
                                }
                              >
                                {perf.performance.toLocaleString()}원
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
