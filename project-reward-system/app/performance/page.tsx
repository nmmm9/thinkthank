'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getProjects, getMembers, getOpexList, getSchedules } from '@/lib/api';
import type { Project, Opex, MemberWithRelations, Schedule } from '@/lib/supabase/database.types';
import { ChevronDown, ChevronRight, Briefcase, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { getWorkingDaysInMonth, getYearMonthFromDate } from '@/lib/utils/workdays';
import { useAuthStore } from '@/lib/auth-store';
import PerformanceCommentModal from '@/components/PerformanceCommentModal';

export default function PerformancePage() {
  const { member: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState('2025');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 코멘트 모달 상태
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    projectId: string;
    projectName: string;
    memberId: string;
    memberName: string;
  }>({
    isOpen: false,
    projectId: '',
    projectName: '',
    memberId: '',
    memberName: '',
  });

  const openCommentModal = (projectId: string, projectName: string, memberId: string, memberName: string) => {
    setCommentModal({
      isOpen: true,
      projectId,
      projectName,
      memberId,
      memberName,
    });
  };

  const closeCommentModal = () => {
    setCommentModal((prev) => ({ ...prev, isOpen: false }));
    // URL 파라미터 제거
    router.replace('/performance', { scroll: false });
  };

  // URL 파라미터로 모달 자동 열기 (알림에서 클릭 시)
  useEffect(() => {
    const openComment = searchParams.get('openComment');
    const projectId = searchParams.get('projectId');
    const memberId = searchParams.get('memberId');
    const projectName = searchParams.get('projectName');
    const memberName = searchParams.get('memberName');

    if (openComment === 'true' && projectId && memberId) {
      setCommentModal({
        isOpen: true,
        projectId,
        projectName: projectName || '',
        memberId,
        memberName: memberName || '',
      });
    }
  }, [searchParams]);

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
  const calculateMemberPerformance = (allocation: any, projectId: string) => {
    const member = members.find((m) => m.id === allocation.member_id);
    const project = projects.find((p) => p.id === projectId);

    if (!member || !project) return null;

    const plannedDays = allocation.planned_days || 0;

    const memberSchedules = schedules.filter(
      (s) => s.member_id === allocation.member_id && s.project_id === projectId
    );
    const actualMinutes = memberSchedules.reduce((sum, s) => sum + s.minutes, 0);
    const actualDays = actualMinutes / 480;

    const startDate = allocation.start_date || project.start_date;
    const yearMonth = getYearMonthFromDate(startDate);
    const [year, month] = yearMonth.split('-').map(Number);
    const workingDaysInMonth = getWorkingDaysInMonth(year, month);

    const activeMembers = members.filter((m) => m.is_active && m.is_approved);
    const totalAnnualSalary = activeMembers.reduce((sum, m) => sum + m.annual_salary, 0);
    const totalMonthlySalary = totalAnnualSalary / 12;
    const salaryRatio = totalAnnualSalary > 0 ? member.annual_salary / totalAnnualSalary : 0;

    const monthOpex = opexes.find((o) => o.year_month === yearMonth);
    const opexAmount = monthOpex?.amount || opexes[0]?.amount || 16000000;
    const adminExpense = Math.max(0, opexAmount - totalMonthlySalary);

    const dailyOpex = workingDaysInMonth > 0
      ? (adminExpense * salaryRatio) / workingDaysInMonth
      : 0;

    const dailyCost = workingDaysInMonth > 0
      ? (member.annual_salary / 12) / workingDaysInMonth
      : 0;

    const dailyTotalCost = dailyCost + dailyOpex;
    const plannedInvestment = dailyTotalCost * plannedDays;
    const actualInvestment = dailyTotalCost * actualDays;

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
      efficiencyRate: Math.round(efficiencyRate * 10) / 10,
      plannedInvestment: Math.round(plannedInvestment),
      actualInvestment: Math.round(actualInvestment),
    };
  };

  // 정산 완료된 프로젝트만 필터링
  const settledProjects = useMemo(() => {
    return projects.filter((project) => project.is_settled);
  }, [projects]);

  const projectPerformances = useMemo(() => {
    return settledProjects.map((project) => {
      const allocations = (project as any).allocations || [];
      const memberPerfs = allocations
        .map((allocation: any) => calculateMemberPerformance(allocation, project.id))
        .filter((p: any) => p !== null);

      const contractAmount = project.contract_amount || 0;
      const plannedInvestment = memberPerfs.reduce((sum: number, p: any) => sum + p.plannedInvestment, 0);
      const actualInvestment = memberPerfs.reduce((sum: number, p: any) => sum + p.actualInvestment, 0);

      const plannedPerformance = contractAmount - plannedInvestment;
      const actualPerformance = contractAmount - actualInvestment;
      const performanceDiff = actualPerformance - plannedPerformance;

      const companySharePercent = (project as any).company_share_percent ?? 80;
      const teamSharePercent = 100 - companySharePercent;

      const companyShare = actualPerformance > 0 ? Math.round(actualPerformance * companySharePercent / 100) : 0;
      const teamShare = actualPerformance > 0 ? Math.round(actualPerformance * teamSharePercent / 100) : 0;

      const efficientMembers = memberPerfs.filter((p: any) => p.efficiencyRate > 0);
      const totalEfficiencyRate = efficientMembers.reduce((sum: number, p: any) => sum + p.efficiencyRate, 0);

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
  }, [settledProjects, members, opexes, schedules]);

  // 일반 사원용: 자신이 참여한 프로젝트만 필터링
  const myProjectPerformances = useMemo(() => {
    if (isAdmin || !currentUser) return projectPerformances;

    return projectPerformances
      .filter(p => p.memberPerfs.some((m: any) => m.memberId === currentUser.id))
      .map(p => ({
        ...p,
        // 자신의 성과만 표시
        memberPerfs: p.memberPerfs.filter((m: any) => m.memberId === currentUser.id),
      }));
  }, [projectPerformances, isAdmin, currentUser]);

  // 전체 성과 합계 (관리자: 전체, 일반: 자신의 배분금액)
  const totalPerformance = useMemo(() => {
    if (isAdmin) {
      return projectPerformances.reduce((sum, p) => sum + p.actualPerformance, 0);
    } else {
      // 일반 사원은 자신의 배분금액 합계
      return myProjectPerformances.reduce((sum, p) => {
        const myPerf = p.memberPerfs.find((m: any) => m.memberId === currentUser?.id);
        return sum + (myPerf?.shareAmount || 0);
      }, 0);
    }
  }, [projectPerformances, myProjectPerformances, isAdmin, currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 표시할 프로젝트 (관리자: 전체, 일반: 자신이 참여한 것만)
  const displayProjects = isAdmin ? projectPerformances : myProjectPerformances;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">성과</h1>
        <p className="text-sm text-gray-600">
          {isAdmin ? '프로젝트에 대한 성과를 확인합니다.' : '내가 참여한 프로젝트의 성과를 확인합니다.'}
        </p>
      </div>

      {/* 연도 및 총 성과 */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">{selectedYear}년</h2>
              <p className="text-sm text-gray-600">
                {isAdmin ? '정산 완료된 프로젝트 성과 합계' : '내 성과 배분금액 합계'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">
                {isAdmin ? '총 성과' : '내 배분금액'}
              </div>
              <div className={`text-3xl font-bold ${totalPerformance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {totalPerformance.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="px-6 space-y-4">
        {displayProjects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {isAdmin ? '정산 완료된 프로젝트가 없습니다' : '참여한 정산 완료 프로젝트가 없습니다'}
            </h3>
            <p className="text-sm text-gray-400">
              {isAdmin
                ? '정산 페이지에서 프로젝트 정산을 완료하면 성과가 여기에 표시됩니다.'
                : '내가 참여한 프로젝트가 정산 완료되면 성과가 여기에 표시됩니다.'}
            </p>
          </div>
        ) : displayProjects.map(({ project, memberPerfs, contractAmount, plannedInvestment, actualInvestment, plannedPerformance, actualPerformance, performanceDiff, companySharePercent, teamSharePercent, companyShare, teamShare }) => {
          const isExpanded = expandedProjects[project.id];
          const totalPlannedDays = memberPerfs.reduce((sum: number, p: any) => sum + p.plannedDays, 0);
          const totalActualDays = memberPerfs.reduce((sum: number, p: any) => sum + p.actualDays, 0);
          const daysDiff = totalActualDays - totalPlannedDays;

          // 일반 사원용: 자신의 배분금액
          const myPerf = !isAdmin ? memberPerfs.find((m: any) => m.memberId === currentUser?.id) : null;

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
                  {isAdmin ? (
                    // 관리자: 프로젝트 전체 성과 표시
                    <>
                      <div className={`text-2xl font-bold ${actualPerformance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {actualPerformance.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        예상 {plannedPerformance.toLocaleString()}원 대비{' '}
                        <span className={performanceDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {performanceDiff >= 0 ? '+' : ''}{performanceDiff.toLocaleString()}원
                        </span>
                      </div>
                    </>
                  ) : (
                    // 일반 사원: 자신의 배분금액 표시
                    <>
                      <div className={`text-2xl font-bold ${(myPerf?.shareAmount || 0) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {(myPerf?.shareAmount || 0).toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        내 배분금액
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 프로젝트 상세 (펼쳤을 때) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* 프로젝트 요약 - 관리자만 전체 정보 표시 */}
                  {isAdmin ? (
                    <>
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

                      {/* 팀원별 상세 테이블 - 관리자용 */}
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
                              <th className="px-4 py-3 text-center font-medium text-gray-700">피드백</th>
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
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => openCommentModal(project.id, project.name, perf.memberId, perf.memberName)}
                                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="피드백 보기/작성"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    // 일반 사원: 자신의 성과만 표시
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">예상 투입</div>
                          <div className="text-xl font-bold text-gray-900">
                            {myPerf?.plannedDays || 0}일
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">실제 투입</div>
                          <div className="text-xl font-bold text-gray-900">
                            {myPerf?.actualDays || 0}일
                          </div>
                        </div>
                        <div className={`rounded-lg p-4 border ${(myPerf?.savedDays || 0) > 0 ? 'bg-green-50 border-green-200' : (myPerf?.savedDays || 0) < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="text-sm text-gray-600 mb-1">절약 일수</div>
                          <div className={`text-xl font-bold ${(myPerf?.savedDays || 0) > 0 ? 'text-green-600' : (myPerf?.savedDays || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {(myPerf?.savedDays || 0) > 0 ? '+' : ''}{myPerf?.savedDays || 0}일
                          </div>
                        </div>
                        <div className={`rounded-lg p-4 border ${(myPerf?.shareAmount || 0) > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="text-sm text-gray-600 mb-1">내 배분금액</div>
                          <div className={`text-xl font-bold ${(myPerf?.shareAmount || 0) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {(myPerf?.shareAmount || 0).toLocaleString()}원
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-600">효율성</div>
                            <div className={`text-lg font-bold ${(myPerf?.efficiencyRate || 0) > 0 ? 'text-green-600' : (myPerf?.efficiencyRate || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {(myPerf?.efficiencyRate || 0) > 0 ? '+' : ''}{myPerf?.efficiencyRate || 0}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">배분 비율</div>
                            <div className="text-lg font-bold text-gray-900">
                              {myPerf?.sharePercent || 0}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 피드백 확인 버튼 - 일반 사원용 */}
                      {currentUser && (
                        <button
                          onClick={() => openCommentModal(project.id, project.name, currentUser.id, currentUser.name)}
                          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquare className="w-5 h-5" />
                          <span>피드백 확인하기</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 코멘트 모달 */}
      <PerformanceCommentModal
        isOpen={commentModal.isOpen}
        onClose={closeCommentModal}
        projectId={commentModal.projectId}
        projectName={commentModal.projectName}
        memberId={commentModal.memberId}
        memberName={commentModal.memberName}
      />
    </div>
  );
}
