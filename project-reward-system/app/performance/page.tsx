'use client';

import { useState, useMemo, useEffect } from 'react';
import { getProjects, getTeams, getMembers, getOpexList } from '@/lib/api';
import type { Project, Team, Opex, MemberWithRelations } from '@/lib/supabase/database.types';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, teamsData, membersData, opexData] = await Promise.all([
          getProjects(),
          getTeams(),
          getMembers(),
          getOpexList(),
        ]);
        setProjects(projectsData);
        setTeams(teamsData);
        setMembers(membersData);
        setOpexes(opexData);
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

  // 성과 계산 (allocations의 planned_days 기준)
  // 1. 판관비 = 운영비 - 전체 월급 합계
  // 2. 1인 판관비 = 판관비 × (개인연봉 / 전체연봉) / 해당월 근무일수
  // 3. 1일 매출원가 = 연봉 / 12 / 해당월 근무일수
  const calculateMemberPerformance = (allocation: any) => {
    const member = members.find((m) => m.id === allocation.member_id);
    const project = projects.find((p) => p.id === allocation.project_id);

    if (!member || !project) return null;

    // allocation에서 투입일수 가져오기
    const plannedDays = allocation.planned_days || 0;

    if (plannedDays === 0) {
      return {
        memberName: member.name,
        dailyCost: 0,
        dailyOpex: 0,
        dailyTotalCost: 0,
        actualDays: 0,
        totalInvestment: 0,
      };
    }

    // 프로젝트 시작월 기준으로 계산 (allocation의 start_date 또는 project의 start_date)
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

    // 총 투입비용 = 1일 투입비 × 투입일수
    const totalInvestment = dailyTotalCost * plannedDays;

    return {
      memberName: member.name,
      dailyCost: Math.round(dailyCost),
      dailyOpex: Math.round(dailyOpex),
      dailyTotalCost: Math.round(dailyTotalCost),
      actualDays: plannedDays,
      totalInvestment: Math.round(totalInvestment),
    };
  };

  // 프로젝트별 성과 계산
  const projectPerformances = useMemo(() => {
    return projects.map((project) => {
      // API에서는 allocations로 조인됨
      const allocations = (project as any).allocations || [];
      const memberPerfs = allocations
        .map((allocation: any) => calculateMemberPerformance(allocation))
        .filter((p: any) => p !== null);

      // 계약금은 프로젝트 전체 금액
      const contractAmount = project.contract_amount || 0;
      // 총 투입비용 = 모든 팀원의 투입비용 합계
      const totalInvestment = memberPerfs.reduce((sum: number, p: any) => sum + p.totalInvestment, 0);
      // 성과 = 계약금 - 총 투입비용
      const performance = contractAmount - totalInvestment;

      return {
        project,
        memberPerfs,
        contractAmount,
        totalInvestment,
        performance,
      };
    });
  }, [projects, members, opexes]);

  // 전체 성과 합계
  const totalPerformance = useMemo(() => {
    return projectPerformances.reduce((sum, p) => sum + p.performance, 0);
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
        {projectPerformances.map(({ project, memberPerfs, contractAmount, totalInvestment, performance }) => {
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
                  <div className={`text-2xl font-bold ${performance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {performance.toLocaleString()}원
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    계약금 {contractAmount.toLocaleString()}원 - 투입비 {totalInvestment.toLocaleString()}원
                  </div>
                </div>
              </div>

              {/* 프로젝트 상세 (펼쳤을 때) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* 프로젝트 요약 */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">계약금</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {contractAmount.toLocaleString()}원
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <UsersIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">총 투입비용</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {totalInvestment.toLocaleString()}원
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200 bg-blue-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-blue-600 font-medium">성과</span>
                      </div>
                      <div className={`text-2xl font-bold ${performance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {performance.toLocaleString()}원
                      </div>
                    </div>
                  </div>

                  {/* 팀원별 상세 테이블 */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">팀원</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">1일 인건비</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">1일 판관비</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">1일 투입비</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">참여일수</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">총 투입비용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {memberPerfs.map((perf: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {perf.memberName.charAt(0)}
                                </div>
                                <div className="font-medium text-gray-900">{perf.memberName}</div>
                              </div>
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
                            <td className="px-4 py-3 text-right text-gray-700 font-medium">
                              {perf.totalInvestment.toLocaleString()}원
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
