'use client';

import { useState, useMemo, useEffect } from 'react';
import { getProjects, getMembers, getOpexList, getSchedules } from '@/lib/api';
import type { Project, Opex, MemberWithRelations, Schedule } from '@/lib/supabase/database.types';
import { ChevronDown, ChevronRight, Users as UsersIcon, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { getWorkingDaysInMonth, getYearMonthFromDate } from '@/lib/utils/workdays';

export default function PerformancePage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, membersData, opexData, schedulesData] = await Promise.all([
          getProjects(),
          getMembers(),
          getOpexList(),
          getSchedules(),
        ]);
        setProjects(projectsData);
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

  // 성과 계산 (계획 vs 실제)
  // 1. 판관비 = 운영비 - 전체 월급 합계
  // 2. 1인 판관비 = 판관비 × (개인연봉 / 전체연봉) / 해당월 근무일수
  // 3. 1일 매출원가 = 연봉 / 12 / 해당월 근무일수
  const calculateMemberPerformance = (allocation: any, projectId: string) => {
    const member = members.find((m) => m.id === allocation.member_id);
    const project = projects.find((p) => p.id === projectId);

    if (!member || !project) return null;

    // 계획 투입일수 (allocation에서)
    const plannedDays = allocation.planned_days || 0;

    // 실제 투입시간 (schedules에서 계산)
    const memberSchedules = schedules.filter(
      (s) => s.member_id === allocation.member_id && s.project_id === projectId
    );
    const actualMinutes = memberSchedules.reduce((sum, s) => sum + s.minutes, 0);
    const actualDays = actualMinutes / 480; // 480분 = 8시간 = 1일

    // 프로젝트 시작월 기준으로 계산
    const startDate = allocation.start_date || project.start_date;
    const yearMonth = getYearMonthFromDate(startDate);
    const [year, month] = yearMonth.split('-').map(Number);
    const workingDaysInMonth = getWorkingDaysInMonth(year, month);

    // 활성 멤버들의 총 연봉
    const activeMembers = members.filter((m) => m.is_active && m.is_approved);
    const totalAnnualSalary = activeMembers.reduce((sum, m) => sum + m.annual_salary, 0);

    // 월별 총 월급 (연봉 / 12)
    const totalMonthlySalary = totalAnnualSalary / 12;

    // 개인 연봉 비중
    const salaryRatio = totalAnnualSalary > 0 ? member.annual_salary / totalAnnualSalary : 0;

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

    // 계획 투입비용 = 1일 투입비 × 계획 투입일수
    const plannedInvestment = dailyTotalCost * plannedDays;

    // 실제 투입비용 = 1일 투입비 × 실제 투입일수
    const actualInvestment = dailyTotalCost * actualDays;

    // 절약률 계산 (예상 대비 얼마나 절약했는지)
    const savedDays = plannedDays - actualDays;
    const efficiencyRate = plannedDays > 0 ? (savedDays / plannedDays) * 100 : 0;

    return {
      memberId: member.id,
      memberName: member.name,
      dailyCost: Math.round(dailyCost),
      dailyOpex: Math.round(dailyOpex),
      dailyTotalCost: Math.round(dailyTotalCost),
      plannedDays,
      actualDays: Math.round(actualDays * 10) / 10,
      savedDays: Math.round(savedDays * 10) / 10,
      efficiencyRate: Math.round(efficiencyRate * 10) / 10, // 절약률 (%)
      plannedInvestment: Math.round(plannedInvestment),
      actualInvestment: Math.round(actualInvestment),
    };
  };

  // 프로젝트별 성과 계산
  // 완료된 프로젝트만 필터링
  const completedProjects = useMemo(() => {
    return projects.filter((project) => project.status === 'completed');
  }, [projects]);

  const projectPerformances = useMemo(() => {
    return completedProjects.map((project) => {
      // API에서는 allocations로 조인됨
      const allocations = (project as any).allocations || [];
      const memberPerfs = allocations
        .map((allocation: any) => calculateMemberPerformance(allocation, project.id))
        .filter((p: any) => p !== null);

      // 계약금은 프로젝트 전체 금액
      const contractAmount = project.contract_amount || 0;

      // 계획 투입비용 합계
      const plannedInvestment = memberPerfs.reduce((sum: number, p: any) => sum + p.plannedInvestment, 0);
      // 실제 투입비용 합계
      const actualInvestment = memberPerfs.reduce((sum: number, p: any) => sum + p.actualInvestment, 0);

      // 예상 성과 = 계약금 - 계획 투입비용
      const plannedPerformance = contractAmount - plannedInvestment;
      // 실제 성과 = 계약금 - 실제 투입비용
      const actualPerformance = contractAmount - actualInvestment;

      // 성과 차이 (+ 면 예상보다 효율적, - 면 비효율적)
      const performanceDiff = actualPerformance - plannedPerformance;

      // 회사:팀원 배분 비율
      const companySharePercent = (project as any).company_share_percent ?? 80;
      const teamSharePercent = 100 - companySharePercent;

      // 성과가 양수일 때만 배분
      const companyShare = actualPerformance > 0 ? Math.round(actualPerformance * companySharePercent / 100) : 0;
      const teamShare = actualPerformance > 0 ? Math.round(actualPerformance * teamSharePercent / 100) : 0;

      // 팀원별 성과 배분 계산
      // 효율적인 멤버만 배분 대상 (efficiencyRate > 0)
      const efficientMembers = memberPerfs.filter((p: any) => p.efficiencyRate > 0);
      const totalEfficiencyRate = efficientMembers.reduce((sum: number, p: any) => sum + p.efficiencyRate, 0);

      // 각 멤버별 배분 금액 계산
      const memberShares = memberPerfs.map((perf: any) => {
        if (perf.efficiencyRate <= 0 || totalEfficiencyRate === 0) {
          return { ...perf, shareAmount: 0, sharePercent: 0 };
        }
        const sharePercent = (perf.efficiencyRate / totalEfficiencyRate) * 100;
        const shareAmount = Math.round(teamShare * sharePercent / 100);
        return { ...perf, shareAmount, sharePercent: Math.round(sharePercent * 10) / 10 };
      });

      return {
        project,
        memberPerfs: memberShares,
        contractAmount,
        plannedInvestment,
        actualInvestment,
        plannedPerformance,
        actualPerformance,
        performanceDiff,
        companySharePercent,
        teamSharePercent,
        companyShare,
        teamShare,
      };
    });
  }, [completedProjects, members, opexes, schedules]);

  // 전체 성과 합계
  const totalActualPerformance = useMemo(() => {
    return projectPerformances.reduce((sum, p) => sum + p.actualPerformance, 0);
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
              <p className="text-sm text-gray-600">완료된 프로젝트 성과 합계</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">총 성과</div>
              <div className={`text-3xl font-bold ${totalActualPerformance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {totalActualPerformance.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="px-6 space-y-4">
        {projectPerformances.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">완료된 프로젝트가 없습니다</h3>
            <p className="text-sm text-gray-400">
              프로젝트가 완료되면 성과가 여기에 표시됩니다.
            </p>
          </div>
        ) : projectPerformances.map(({ project, memberPerfs, contractAmount, plannedInvestment, actualInvestment, plannedPerformance, actualPerformance, performanceDiff, companySharePercent, teamSharePercent, companyShare, teamShare }) => {
          const isExpanded = expandedProjects[project.id];
          const totalPlannedDays = memberPerfs.reduce((sum: number, p: any) => sum + p.plannedDays, 0);
          const totalActualDays = memberPerfs.reduce((sum: number, p: any) => sum + p.actualDays, 0);
          const daysDiff = totalActualDays - totalPlannedDays;

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
                        {format(new Date(project.start_date), 'yyyy.MM.dd')} ~{' '}
                        {format(new Date(project.end_date), 'yyyy.MM.dd')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${actualPerformance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {actualPerformance.toLocaleString()}원
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    예상 {plannedPerformance.toLocaleString()}원 대비{' '}
                    <span className={performanceDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {performanceDiff >= 0 ? '+' : ''}{performanceDiff.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              {/* 프로젝트 상세 (펼쳤을 때) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* 프로젝트 요약 - 투입일수 비교 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">계약금</div>
                      <div className="text-xl font-bold text-gray-900">
                        {contractAmount.toLocaleString()}원
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">예상 투입일수</div>
                      <div className="text-xl font-bold text-gray-900">
                        {totalPlannedDays}일
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        예상 투입비 {plannedInvestment.toLocaleString()}원
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">실제 투입일수</div>
                      <div className="text-xl font-bold text-gray-900">
                        {totalActualDays}일
                        <span className={`text-sm ml-2 ${daysDiff <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({daysDiff <= 0 ? '' : '+'}{daysDiff}일)
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        실제 투입비 {actualInvestment.toLocaleString()}원
                      </div>
                    </div>
                    <div className={`rounded-lg p-4 border ${actualPerformance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                      <div className={`text-sm mb-1 ${actualPerformance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>실제 성과</div>
                      <div className={`text-xl font-bold ${actualPerformance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {actualPerformance.toLocaleString()}원
                      </div>
                      <div className={`text-xs mt-1 ${performanceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        예상 대비 {performanceDiff >= 0 ? '+' : ''}{performanceDiff.toLocaleString()}원
                      </div>
                    </div>
                  </div>

                  {/* 성과 배분 */}
                  {actualPerformance > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">성과 배분 (회사 {companySharePercent}% : 팀원 {teamSharePercent}%)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">회사 배분</div>
                          <div className="text-xl font-bold text-gray-900">
                            {companyShare.toLocaleString()}원
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="text-sm text-green-600 mb-1">팀원 배분</div>
                          <div className="text-xl font-bold text-green-700">
                            {teamShare.toLocaleString()}원
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 팀원별 상세 테이블 */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">팀원</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">예상 투입</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">실제 투입</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">절약</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">효율</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">배분 비율</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">배분 금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {memberPerfs.map((perf: any, idx: number) => {
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${perf.efficiencyRate > 0 ? 'bg-green-500' : perf.efficiencyRate < 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
                                    {perf.memberName.charAt(0)}
                                  </div>
                                  <div className="font-medium text-gray-900">{perf.memberName}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700">
                                {perf.plannedDays}일
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700">
                                {perf.actualDays}일
                              </td>
                              <td className={`px-4 py-3 text-center font-medium ${perf.savedDays > 0 ? 'text-green-600' : perf.savedDays < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                {perf.savedDays > 0 ? '+' : ''}{perf.savedDays}일
                              </td>
                              <td className={`px-4 py-3 text-center font-medium ${perf.efficiencyRate > 0 ? 'text-green-600' : perf.efficiencyRate < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                {perf.efficiencyRate > 0 ? '+' : ''}{perf.efficiencyRate}%
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700">
                                {perf.sharePercent > 0 ? `${perf.sharePercent}%` : '-'}
                              </td>
                              <td className={`px-4 py-3 text-right font-bold ${perf.shareAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {perf.shareAmount > 0 ? `${perf.shareAmount.toLocaleString()}원` : '0원'}
                              </td>
                            </tr>
                          );
                        })}
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
