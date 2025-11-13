'use client';

import { useState, useMemo } from 'react';
import { projects, teams, members, opexList, schedules, positions } from '@/mocks/data';
import { ChevronDown, ChevronRight, Users as UsersIcon, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export default function PerformancePage() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // 프로젝트 펼치기/접기
  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // 성과 계산
  const calculateMemberPerformance = (memberId: string, projectId: string) => {
    const member = members.find((m) => m.id === memberId);
    const project = projects.find((p) => p.id === projectId);

    if (!member || !project) return null;

    // 1일 매출원가
    const dailyCost = member.annualSalary / (12 * 20.917);

    // 연봉 비중
    const totalAnnualSalary = members
      .filter((m) => m.isActive && m.isApproved)
      .reduce((sum, m) => sum + m.annualSalary, 0);
    const salaryRatio = totalAnnualSalary > 0 ? member.annualSalary / totalAnnualSalary : 0;

    // 운영비 (최신)
    const opex = opexList[0]?.amount || 16000000;

    // 근무가능일수 (연간)
    const workingDays = 250;

    // 1일 판관비
    const dailyOpex = (opex * salaryRatio) / workingDays;

    // 1일 투입비
    const dailyTotalCost = dailyCost + dailyOpex;

    // 참여일수 계산 (스케줄 데이터에서)
    const memberSchedules = schedules.filter(
      (s) => s.memberId === memberId && s.projectId === projectId
    );
    const totalMinutes = memberSchedules.reduce((sum, s) => sum + s.minutes, 0);
    const actualDays = totalMinutes / 480; // 8시간 = 480분

    // 팀원 계약금 (배분 비율에 따라)
    const allocation = project.memberAllocations?.find((a) => a.memberId === memberId);
    const memberContractAmount = allocation
      ? (project.contractAmount * allocation.balancePercent) / 100
      : 0;

    // 총투입비용
    const totalInvestment = dailyTotalCost * actualDays;

    // 성과
    const performance = memberContractAmount - totalInvestment;

    return {
      memberName: member.name,
      memberContractAmount,
      dailyCost: Math.round(dailyCost),
      dailyOpex: Math.round(dailyOpex),
      dailyTotalCost: Math.round(dailyTotalCost),
      actualDays: Math.round(actualDays * 10) / 10,
      totalInvestment: Math.round(totalInvestment),
      performance: Math.round(performance),
      participationRate: allocation?.balancePercent || 0,
    };
  };

  // 프로젝트별 성과 계산
  const projectPerformances = useMemo(() => {
    return projects.map((project) => {
      const allocations = project.memberAllocations || [];
      const memberPerfs = allocations
        .map((allocation) => calculateMemberPerformance(allocation.memberId, project.id))
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
  }, []);

  // 전체 성과 합계
  const totalPerformance = useMemo(() => {
    return projectPerformances.reduce((sum, p) => sum + p.performanceTotal, 0);
  }, [projectPerformances]);

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
          const team = teams.find((t) => t.id === project.teamId);

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
                        {team?.name || '팀 없음'} • {format(new Date(project.startDate), 'yyyy.MM.dd')} ~{' '}
                        {format(new Date(project.endDate), 'yyyy.MM.dd')}
                      </p>
                    </div>
                  </div>
                  {project.confirmed && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      관련 벌도에요
                    </span>
                  )}
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
