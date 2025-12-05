'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, getMembers, getOpexList, getSchedules, getWorkTimeSetting } from '@/lib/api';
import type { Project, Opex, MemberWithRelations, Schedule, WorkTimeSetting } from '@/lib/supabase/database.types';
import { ChevronDown, ChevronRight, User, Briefcase, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { getWorkingDaysInMonth, getYearMonthFromDate, calculateEffectiveMinutes } from '@/lib/utils/workdays';
import { useAuthStore } from '@/lib/auth-store';

export default function MemberPerformancePage() {
  const router = useRouter();
  const { member: currentUser, isLoading: authLoading } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [selectedYear, setSelectedYear] = useState('2025');
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workTimeSetting, setWorkTimeSetting] = useState<WorkTimeSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 업무시간 설정 (기본값: 09:30 ~ 18:30)
  const workHours = {
    start: workTimeSetting?.work_start_time || '09:30',
    end: workTimeSetting?.work_end_time || '18:30',
  };

  // 권한 체크 - admin만 접근 가능
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      alert('총괄관리자만 접근할 수 있습니다.');
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, membersData, opexData, schedulesData, workTimeData] = await Promise.all([
          getProjects(),
          getMembers(),
          getOpexList(),
          getSchedules(),
          getWorkTimeSetting(),
        ]);
        setProjects(projectsData);
        setMembers(membersData);
        setOpexes(opexData);
        setSchedules(schedulesData);
        setWorkTimeSetting(workTimeData as WorkTimeSetting | null);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 멤버 펼치기/접기
  const toggleMember = (memberId: string) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // 정산 완료된 프로젝트만
  const settledProjects = useMemo(() => {
    return projects.filter((project) => project.is_settled);
  }, [projects]);

  // 활성 멤버 목록
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.is_active && m.is_approved);
  }, [members]);

  // 전체 연봉 합계
  const totalAnnualSalary = useMemo(() => {
    return activeMembers.reduce((sum, m) => sum + m.annual_salary, 0);
  }, [activeMembers]);

  // 직원별 성과 계산
  const memberPerformances = useMemo(() => {
    return activeMembers.map((member) => {
      // 이 멤버가 참여한 정산 완료 프로젝트들
      const memberProjects = settledProjects
        .map((project) => {
          const allocations = (project as any).allocations || [];
          const allocation = allocations.find((a: any) => a.member_id === member.id);

          if (!allocation) return null;

          const plannedDays = allocation.planned_days || 0;

          // 실제 투입 시간 계산 (업무시간 내 유효 분만)
          const memberSchedules = schedules.filter(
            (s) => s.member_id === member.id && s.project_id === project.id
          );
          const actualMinutes = memberSchedules.reduce((sum, s) => {
            return sum + calculateEffectiveMinutes(s, workHours);
          }, 0);
          const actualDays = actualMinutes / 480;

          // 일당 비용 계산
          const startDate = allocation.start_date || project.start_date;
          const yearMonth = getYearMonthFromDate(startDate);
          const [year, month] = yearMonth.split('-').map(Number);
          const workingDaysInMonth = getWorkingDaysInMonth(year, month);

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

          // 배분금액 계산
          const contractAmount = project.contract_amount || 0;
          const allMemberPerfs = allocations.map((a: any) => {
            const m = members.find((mem) => mem.id === a.member_id);
            if (!m) return null;

            const mSchedules = schedules.filter(
              (s) => s.member_id === a.member_id && s.project_id === project.id
            );
            const mActualMinutes = mSchedules.reduce((sum, s) => sum + s.minutes, 0);
            const mActualDays = mActualMinutes / 480;
            const mPlannedDays = a.planned_days || 0;
            const mSavedDays = mPlannedDays - mActualDays;
            const mEfficiency = mPlannedDays > 0 ? (mSavedDays / mPlannedDays) * 100 : 0;

            const mStartDate = a.start_date || project.start_date;
            const mYearMonth = getYearMonthFromDate(mStartDate);
            const [mYear, mMonth] = mYearMonth.split('-').map(Number);
            const mWorkingDays = getWorkingDaysInMonth(mYear, mMonth);
            const mSalaryRatio = totalAnnualSalary > 0 ? m.annual_salary / totalAnnualSalary : 0;
            const mMonthOpex = opexes.find((o) => o.year_month === mYearMonth);
            const mOpexAmount = mMonthOpex?.amount || opexes[0]?.amount || 16000000;
            const mAdminExpense = Math.max(0, mOpexAmount - totalMonthlySalary);
            const mDailyOpex = mWorkingDays > 0 ? (mAdminExpense * mSalaryRatio) / mWorkingDays : 0;
            const mDailyCost = mWorkingDays > 0 ? (m.annual_salary / 12) / mWorkingDays : 0;
            const mDailyTotalCost = mDailyCost + mDailyOpex;
            const mActualInvestment = mDailyTotalCost * mActualDays;

            return {
              memberId: m.id,
              efficiency: mEfficiency,
              actualInvestment: mActualInvestment,
            };
          }).filter((p: any) => p !== null);

          const totalActualInvestment = allMemberPerfs.reduce((sum: number, p: any) => sum + p.actualInvestment, 0);
          const actualPerformance = contractAmount - totalActualInvestment;

          const companySharePercent = (project as any).company_share_percent ?? 80;
          const teamSharePercent = 100 - companySharePercent;
          const teamShare = actualPerformance > 0 ? Math.round(actualPerformance * teamSharePercent / 100) : 0;

          // 효율성 기반 배분
          const efficientMembers = allMemberPerfs.filter((p: any) => p.efficiency > 0);
          const totalEfficiency = efficientMembers.reduce((sum: number, p: any) => sum + p.efficiency, 0);

          let shareAmount = 0;
          if (efficiencyRate > 0 && totalEfficiency > 0) {
            const sharePercent = (efficiencyRate / totalEfficiency) * 100;
            shareAmount = Math.round(teamShare * sharePercent / 100);
          }

          return {
            project,
            plannedDays,
            actualDays: Math.round(actualDays * 10) / 10,
            savedDays: Math.round(savedDays * 10) / 10,
            efficiencyRate: Math.round(efficiencyRate * 10) / 10,
            shareAmount,
          };
        })
        .filter((p) => p !== null);

      // 총합 계산
      const totalPlannedDays = memberProjects.reduce((sum, p) => sum + (p?.plannedDays || 0), 0);
      const totalActualDays = memberProjects.reduce((sum, p) => sum + (p?.actualDays || 0), 0);
      const totalSavedDays = memberProjects.reduce((sum, p) => sum + (p?.savedDays || 0), 0);
      const totalShareAmount = memberProjects.reduce((sum, p) => sum + (p?.shareAmount || 0), 0);
      const avgEfficiency = memberProjects.length > 0
        ? memberProjects.reduce((sum, p) => sum + (p?.efficiencyRate || 0), 0) / memberProjects.length
        : 0;

      return {
        member,
        projects: memberProjects,
        projectCount: memberProjects.length,
        totalPlannedDays,
        totalActualDays: Math.round(totalActualDays * 10) / 10,
        totalSavedDays: Math.round(totalSavedDays * 10) / 10,
        avgEfficiency: Math.round(avgEfficiency * 10) / 10,
        totalShareAmount,
      };
    })
    .filter((mp) => mp.projectCount > 0) // 참여한 프로젝트가 있는 멤버만
    .sort((a, b) => b.totalShareAmount - a.totalShareAmount); // 배분금액 순 정렬
  }, [activeMembers, settledProjects, schedules, opexes, members, totalAnnualSalary]);

  // 전체 성과 합계
  const totalPerformance = useMemo(() => {
    return memberPerformances.reduce((sum, mp) => sum + mp.totalShareAmount, 0);
  }, [memberPerformances]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">직원별 성과</h1>
        <p className="text-sm text-gray-600">
          조직 내 모든 직원의 성과를 확인합니다. (총괄관리자 전용)
        </p>
      </div>

      {/* 연도 및 총 성과 */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">{selectedYear}년</h2>
              <p className="text-sm text-gray-600">
                정산 완료된 프로젝트 기준 팀원 배분금액 합계
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">총 팀원 배분금액</div>
              <div className={`text-3xl font-bold ${totalPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPerformance.toLocaleString()}원
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {memberPerformances.length}명 참여
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 직원 목록 */}
      <div className="px-6 space-y-4">
        {memberPerformances.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              성과 데이터가 없습니다
            </h3>
            <p className="text-sm text-gray-400">
              정산 완료된 프로젝트에 참여한 직원이 없습니다.
            </p>
          </div>
        ) : (
          memberPerformances.map(({ member, projects: memberProjects, projectCount, totalPlannedDays, totalActualDays, totalSavedDays, avgEfficiency, totalShareAmount }) => {
            const isExpanded = expandedMembers[member.id];

            return (
              <div key={member.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 직원 헤더 */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                  onClick={() => toggleMember(member.id)}
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${avgEfficiency > 0 ? 'bg-green-500' : avgEfficiency < 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-sm text-gray-500">
                          {member.team?.name || '팀 미배정'} | {projectCount}개 프로젝트 참여
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 요약 정보 */}
                  <div className="flex items-center gap-6">
                    <div className="text-center hidden md:block">
                      <div className="text-xs text-gray-500">효율성</div>
                      <div className={`text-lg font-bold ${avgEfficiency > 0 ? 'text-green-600' : avgEfficiency < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {avgEfficiency > 0 ? '+' : ''}{avgEfficiency}%
                      </div>
                    </div>
                    <div className="text-center hidden md:block">
                      <div className="text-xs text-gray-500">절약일</div>
                      <div className={`text-lg font-bold ${totalSavedDays > 0 ? 'text-green-600' : totalSavedDays < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {totalSavedDays > 0 ? '+' : ''}{totalSavedDays}일
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${totalShareAmount > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {totalShareAmount.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500">배분금액</div>
                    </div>
                  </div>
                </div>

                {/* 직원 상세 (펼쳤을 때) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {/* 요약 카드 */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Briefcase className="w-4 h-4" />
                          참여 프로젝트
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          {projectCount}개
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          예상 투입
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          {totalPlannedDays}일
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">실제 투입</div>
                        <div className="text-xl font-bold text-gray-900">
                          {totalActualDays}일
                        </div>
                      </div>
                      <div className={`rounded-lg p-4 border ${totalSavedDays > 0 ? 'bg-green-50 border-green-200' : totalSavedDays < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                        <div className="text-sm text-gray-600 mb-1">절약 일수</div>
                        <div className={`text-xl font-bold ${totalSavedDays > 0 ? 'text-green-600' : totalSavedDays < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {totalSavedDays > 0 ? '+' : ''}{totalSavedDays}일
                        </div>
                      </div>
                      <div className={`rounded-lg p-4 border ${totalShareAmount > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <TrendingUp className="w-4 h-4" />
                          총 배분금액
                        </div>
                        <div className={`text-xl font-bold ${totalShareAmount > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {totalShareAmount.toLocaleString()}원
                        </div>
                      </div>
                    </div>

                    {/* 프로젝트별 상세 테이블 */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">프로젝트</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">기간</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">예상</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">실제</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">절약</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-700">효율</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">배분금액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {memberProjects.map((perf: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{perf.project.name}</div>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                {format(new Date(perf.project.start_date), 'yy.MM.dd')} ~{' '}
                                {format(new Date(perf.project.end_date), 'yy.MM.dd')}
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
                              <td className={`px-4 py-3 text-right font-bold ${perf.shareAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {perf.shareAmount > 0 ? `${perf.shareAmount.toLocaleString()}원` : '0원'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <td className="px-4 py-3 font-semibold text-gray-900">합계</td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">
                              {totalPlannedDays}일
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">
                              {totalActualDays}일
                            </td>
                            <td className={`px-4 py-3 text-center font-semibold ${totalSavedDays > 0 ? 'text-green-600' : totalSavedDays < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {totalSavedDays > 0 ? '+' : ''}{totalSavedDays}일
                            </td>
                            <td className={`px-4 py-3 text-center font-semibold ${avgEfficiency > 0 ? 'text-green-600' : avgEfficiency < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {avgEfficiency > 0 ? '+' : ''}{avgEfficiency}%
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${totalShareAmount > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                              {totalShareAmount.toLocaleString()}원
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
