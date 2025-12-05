'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getProjects, getMembers, getOpexList, getSchedules, getCommentsByMember, getWorkTimeSetting, type PerformanceCommentWithRelations } from '@/lib/api';
import { getDailyLunchTimes } from '@/lib/api/settings';
import type { Project, Opex, MemberWithRelations, Schedule, WorkTimeSetting } from '@/lib/supabase/database.types';
import { ChevronDown, ChevronRight, Briefcase, MessageSquare, MessageCircle, Calendar, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getWorkingDaysInMonth, getYearMonthFromDate, calculateEffectiveMinutes } from '@/lib/utils/workdays';
import { useAuthStore } from '@/lib/auth-store';
import PerformanceCommentModal from '@/components/PerformanceCommentModal';
import AnimatedCounter from '@/components/charts/AnimatedCounter';
import EfficiencyGauge from '@/components/charts/EfficiencyGauge';
import DistributionDonut from '@/components/charts/DistributionDonut';
import MemberComparisonChart from '@/components/charts/MemberComparisonChart';
import ProgressBar from '@/components/charts/ProgressBar';

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
  const [workTimeSetting, setWorkTimeSetting] = useState<WorkTimeSetting | null>(null);
  const [dailyLunchTimes, setDailyLunchTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 업무시간 설정 (기본값: 09:30 ~ 18:30)
  const workHours = {
    start: workTimeSetting?.work_start_time || '09:30',
    end: workTimeSetting?.work_end_time || '18:30',
  };

  // 기본 점심시간 설정 (기본값: 12:00 ~ 13:00)
  const defaultLunchHours = {
    start: workTimeSetting?.lunch_start_time || '12:00',
    end: workTimeSetting?.lunch_end_time || '13:00',
  };

  // 특정 날짜의 점심시간 가져오기
  const getLunchHoursForDate = (date: string) => {
    if (dailyLunchTimes[date]) {
      return dailyLunchTimes[date];
    }
    return defaultLunchHours;
  };

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'performance' | 'feedback'>('performance');

  // 내가 받은 피드백
  const [myComments, setMyComments] = useState<PerformanceCommentWithRelations[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

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

        // 스케줄 날짜 범위에서 일별 점심시간 로드
        const schedulesList = schedulesData as Schedule[];
        if (schedulesList.length > 0) {
          const dates = schedulesList.map(s => s.date).sort();
          const startDate = dates[0];
          const endDate = dates[dates.length - 1];

          try {
            const lunchTimesData = await getDailyLunchTimes(startDate, endDate);
            const lunchTimesMap: Record<string, { start: string; end: string }> = {};
            lunchTimesData.forEach((lt: any) => {
              lunchTimesMap[lt.date] = {
                start: lt.start_time,
                end: lt.end_time,
              };
            });
            setDailyLunchTimes(lunchTimesMap);
          } catch (err) {
            console.error('Failed to load daily lunch times:', err);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 피드백 탭 선택 시 내 코멘트 로드
  useEffect(() => {
    const loadMyComments = async () => {
      if (activeTab !== 'feedback' || !currentUser?.id) return;

      try {
        setIsLoadingComments(true);
        const comments = await getCommentsByMember(currentUser.id);
        setMyComments(comments);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    };
    loadMyComments();
  }, [activeTab, currentUser?.id]);

  // 프로젝트별로 코멘트 그룹핑
  const commentsByProject = useMemo(() => {
    const grouped: Record<string, { projectName: string; comments: PerformanceCommentWithRelations[] }> = {};

    myComments.forEach((comment) => {
      const projectId = comment.project_id;
      const projectName = comment.project?.name || '알 수 없는 프로젝트';

      if (!grouped[projectId]) {
        grouped[projectId] = { projectName, comments: [] };
      }
      grouped[projectId].comments.push(comment);
    });

    return grouped;
  }, [myComments]);

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
    // 업무시간 내 유효 분만 계산 (점심시간 제외)
    const actualMinutes = memberSchedules.reduce((sum, s) => {
      const lunchHours = getLunchHoursForDate(s.date);
      return sum + calculateEffectiveMinutes(s, workHours, lunchHours);
    }, 0);
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

    // 반올림된 값으로 계산 (표시값과 일치시키기 위해)
    const roundedPlannedDays = Number(Number(plannedDays).toFixed(1));
    const roundedActualDays = Number(actualDays.toFixed(1));
    const roundedSavedDays = Number((roundedPlannedDays - roundedActualDays).toFixed(1));
    const efficiencyRate = roundedPlannedDays > 0 ? (roundedSavedDays / roundedPlannedDays) * 100 : 0;

    // 절약한 비용 계산 (예상투입비 - 실제투입비)
    const savedCost = plannedInvestment - actualInvestment;

    return {
      memberId: member.id,
      memberName: member.name,
      dailyCost: Math.round(dailyCost),
      dailyOpex: Math.round(dailyOpex),
      dailyTotalCost: Math.round(dailyTotalCost),
      plannedDays: roundedPlannedDays,
      actualDays: roundedActualDays,
      savedDays: roundedSavedDays,
      efficiencyRate: Number(efficiencyRate.toFixed(1)),
      plannedInvestment: Math.round(plannedInvestment),
      actualInvestment: Math.round(actualInvestment),
      savedCost: Math.round(savedCost), // 절약한 비용 추가
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

      // 회사/팀 배분 비율
      const companySharePercent = (project as any).company_share_percent ?? 80;
      const teamSharePercent = 100 - companySharePercent;

      // 예상 대비 추가 성과 (빨리 끝내서 생긴 이익)
      // performanceDiff를 회사/팀원 비율로 먼저 분배
      const bonusPoolTotal = performanceDiff > 0 ? performanceDiff : 0;
      const companyBonusShare = Math.round(bonusPoolTotal * companySharePercent / 100);
      const teamBonusPool = Math.round(bonusPoolTotal * teamSharePercent / 100);

      // 효율이 양수인 멤버들 (예상보다 빨리 끝낸 사람)
      const efficientMembers = memberPerfs.filter((p: any) => p.efficiencyRate > 0);
      const totalEfficiencyRate = efficientMembers.reduce((sum: number, p: any) => sum + p.efficiencyRate, 0);

      // 효율 비율로 성과금 배분 (팀원 몫에서)
      const memberShares = memberPerfs.map((perf: any) => {
        if (perf.efficiencyRate <= 0 || totalEfficiencyRate === 0 || teamBonusPool === 0) {
          return { ...perf, shareAmount: 0, sharePercent: 0 };
        }
        // 효율 비율로 배분
        const sharePercent = (perf.efficiencyRate / totalEfficiencyRate) * 100;
        const shareAmount = Math.round(teamBonusPool * sharePercent / 100);
        return { ...perf, shareAmount, sharePercent: Math.round(sharePercent * 10) / 10 };
      });

      // 회사/팀 배분 표시용
      const companyShare = companyBonusShare; // 예상 대비 추가 성과 중 회사 몫
      const teamShare = teamBonusPool; // 예상 대비 추가 성과 중 팀원 몫

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
      <div className="bg-white border-b border-gray-200 p-6 pb-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">성과</h1>
        <p className="text-sm text-gray-600 mb-4">
          {isAdmin ? '프로젝트에 대한 성과를 확인합니다.' : '내가 참여한 프로젝트의 성과를 확인합니다.'}
        </p>

        {/* 탭 */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'performance'
                ? 'bg-gray-50 text-blue-600 border-t-2 border-x border-blue-600 border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              프로젝트별 성과
            </div>
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'feedback'
                ? 'bg-gray-50 text-blue-600 border-t-2 border-x border-blue-600 border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              내가 받은 피드백
              {myComments.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                  {myComments.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 프로젝트별 성과 탭 */}
      {activeTab === 'performance' && (
        <>
          {/* 연도 및 총 성과 */}
          <div className="px-6 py-6">
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
                    <AnimatedCounter value={totalPerformance} suffix="원" />
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
          const totalPlannedDays = Number(memberPerfs.reduce((sum: number, p: any) => sum + p.plannedDays, 0).toFixed(1));
          const totalActualDays = Number(memberPerfs.reduce((sum: number, p: any) => sum + p.actualDays, 0).toFixed(1));
          const daysDiff = Number((totalActualDays - totalPlannedDays).toFixed(1));

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
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                        </div>
                        <div className={`rounded-lg p-4 border ${performanceDiff > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className={`text-sm mb-1 ${performanceDiff > 0 ? 'text-green-600' : 'text-gray-600'}`}>예상 대비 추가 성과</div>
                          <div className={`text-xl font-bold ${performanceDiff > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {performanceDiff > 0 ? '+' : ''}{performanceDiff.toLocaleString()}원
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            분배 대상 금액
                          </div>
                        </div>
                      </div>

                      {/* 진행률 바 */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">투입 현황</h4>
                        <ProgressBar
                          planned={totalPlannedDays}
                          actual={totalActualDays}
                          label="투입 일수"
                          unit="일"
                        />
                      </div>

                      {/* 성과 배분 */}
                      {actualPerformance > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">성과 배분 (회사 {companySharePercent}% : 팀원 {teamSharePercent}%)</h4>
                          <div className="flex flex-wrap items-center gap-6">
                            <DistributionDonut
                              companyShare={companyShare}
                              teamShare={teamShare}
                              companyPercent={companySharePercent}
                              teamPercent={teamSharePercent}
                            />
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                                <div className="text-sm text-gray-600 mb-1">회사 배분</div>
                                <div className="text-xl font-bold text-gray-900">
                                  <AnimatedCounter value={companyShare} suffix="원" />
                                </div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <div className="text-sm text-green-600 mb-1">팀원 배분</div>
                                <div className="text-xl font-bold text-green-700">
                                  <AnimatedCounter value={teamShare} suffix="원" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 팀원별 비교 차트 */}
                      {memberPerfs.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">팀원별 투입 비교</h4>
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <MemberComparisonChart
                              data={memberPerfs.map((p: any) => ({
                                memberName: p.memberName,
                                plannedDays: p.plannedDays,
                                actualDays: p.actualDays,
                                savedDays: p.savedDays,
                                efficiencyRate: p.efficiencyRate,
                                shareAmount: p.shareAmount,
                              }))}
                            />
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
                                    {Number(perf.plannedDays.toFixed(1))}일
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-700">
                                    {Number(perf.actualDays.toFixed(1))}일
                                  </td>
                                  <td className={`px-4 py-3 text-center font-medium ${perf.savedDays > 0 ? 'text-green-600' : perf.savedDays < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {perf.savedDays > 0 ? '+' : ''}{Number(perf.savedDays.toFixed(1))}일
                                  </td>
                                  <td className={`px-4 py-3 text-center font-medium ${perf.efficiencyRate > 0 ? 'text-green-600' : perf.efficiencyRate < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {perf.efficiencyRate > 0 ? '+' : ''}{Number(perf.efficiencyRate.toFixed(1))}%
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
                      {/* 진행률 바 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <ProgressBar
                          planned={myPerf?.plannedDays || 0}
                          actual={myPerf?.actualDays || 0}
                          label="내 투입 현황"
                          unit="일"
                        />
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">예상 투입</div>
                          <div className="text-xl font-bold text-gray-900">
                            <AnimatedCounter value={myPerf?.plannedDays || 0} suffix="일" formatNumber={false} />
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">실제 투입</div>
                          <div className="text-xl font-bold text-gray-900">
                            <AnimatedCounter value={myPerf?.actualDays || 0} suffix="일" formatNumber={false} />
                          </div>
                        </div>
                        <div className={`rounded-lg p-4 border ${(myPerf?.savedDays || 0) > 0 ? 'bg-green-50 border-green-200' : (myPerf?.savedDays || 0) < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="text-sm text-gray-600 mb-1">절약 일수</div>
                          <div className={`text-xl font-bold ${(myPerf?.savedDays || 0) > 0 ? 'text-green-600' : (myPerf?.savedDays || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {(myPerf?.savedDays || 0) > 0 ? '+' : ''}{Number((myPerf?.savedDays || 0).toFixed(1))}일
                          </div>
                        </div>
                        <div className={`rounded-lg p-4 border ${(myPerf?.shareAmount || 0) > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="text-sm text-gray-600 mb-1">내 배분금액</div>
                          <div className={`text-xl font-bold ${(myPerf?.shareAmount || 0) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            <AnimatedCounter value={myPerf?.shareAmount || 0} suffix="원" />
                          </div>
                        </div>
                      </div>

                      {/* 효율성 게이지 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex flex-wrap items-center justify-around gap-4">
                          <EfficiencyGauge
                            value={myPerf?.efficiencyRate || 0}
                            size={140}
                            label="효율성"
                          />
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-1">배분 비율</div>
                            <div className="text-3xl font-bold text-gray-900">
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
        </>
      )}

      {/* 내가 받은 피드백 탭 */}
      {activeTab === 'feedback' && (
        <div className="px-6 py-6">
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : myComments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">받은 피드백이 없습니다</h3>
              <p className="text-sm text-gray-400">
                관리자가 피드백을 남기면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 총 피드백 수 */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">전체 피드백</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {Object.keys(commentsByProject).length}개 프로젝트에서 총 {myComments.length}개의 피드백
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* 프로젝트별 피드백 */}
              {Object.entries(commentsByProject).map(([projectId, { projectName, comments }]) => (
                <div key={projectId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* 프로젝트 헤더 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{projectName}</h3>
                        <p className="text-sm text-gray-500">{comments.length}개의 피드백</p>
                      </div>
                    </div>
                  </div>

                  {/* 코멘트 목록 */}
                  <div className="divide-y divide-gray-100">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {comment.author?.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{comment.author?.name}</span>
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                관리자
                              </span>
                              {!comment.is_read && (
                                <span className="text-xs text-white bg-red-500 px-2 py-0.5 rounded-full">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">
                              {comment.content}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(comment.created_at), 'yyyy년 M월 d일 HH:mm', { locale: ko })}</span>
                              <span className="text-gray-300">|</span>
                              <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
