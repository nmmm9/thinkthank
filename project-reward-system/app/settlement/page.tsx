'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect, FilterInput } from '@/components/FilterBar';
import Modal from '@/components/Modal';
import { SaveButton, DeleteButton } from '@/components/ActionButtons';
import { getProjects, getReceipts, getProjectCategories, getMembers, getOpexList, getSchedules, settleProject, unsettleProject } from '@/lib/api';
import type { Project, Receipt, ProjectCategory, Schedule, Opex, MemberWithRelations } from '@/lib/supabase/database.types';
import { format, differenceInDays } from 'date-fns';
import { Star, Check } from 'lucide-react';
import { getWorkingDaysInMonth, getYearMonthFromDate } from '@/lib/utils/workdays';
import { useAuthStore } from '@/lib/auth-store';

export default function SettlementPage() {
  const { member: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedStatus, setSelectedStatus] = useState('진행상태 - 전체');
  const [selectedCategory, setSelectedCategory] = useState('구분 - 전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, receiptsData, categoriesData, membersData, opexData, schedulesData] = await Promise.all([
          getProjects(),
          getReceipts(),
          getProjectCategories(),
          getMembers(),
          getOpexList(),
          getSchedules(),
        ]);
        setProjects(projectsData);
        setReceipts(receiptsData);
        setProjectCategories(categoriesData);
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: '진행예정',
      inprogress: '진행중',
      completed: '완료',
      paused: '취소',
    };
    return labels[status] || status;
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

  // 남은 기간 계산
  const getRemainingDays = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    return differenceInDays(end, today);
  };

  // 남은 기간에 따른 색상
  const getRemainingDaysColor = (days: number) => {
    if (days < 0) return 'text-gray-400'; // 마감됨
    if (days <= 3) return 'text-red-600 font-bold'; // 3일 이하
    if (days <= 7) return 'text-red-500 font-semibold'; // 7일 이하
    if (days <= 14) return 'text-orange-500 font-medium'; // 14일 이하
    if (days <= 30) return 'text-yellow-600'; // 30일 이하
    return 'text-gray-600'; // 여유 있음
  };

  // 남은 기간 배경색
  const getRemainingDaysBgColor = (days: number) => {
    if (days < 0) return 'bg-gray-100'; // 마감됨
    if (days <= 3) return 'bg-red-100'; // 3일 이하
    if (days <= 7) return 'bg-red-50'; // 7일 이하
    if (days <= 14) return 'bg-orange-50'; // 14일 이하
    return ''; // 여유 있음
  };

  // 남은 기간 텍스트
  const getRemainingDaysText = (days: number) => {
    if (days < 0) return '마감';
    if (days === 0) return 'D-Day';
    return `D-${days}`;
  };

  // 프로젝트별 지출 총액 계산 (성과 페이지 로직과 동일)
  const calculateProjectExpense = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return 0;

    // API에서는 allocations로 조인됨
    const allocations = (project as any).allocations || [];
    let totalExpense = 0;

    // 활성 멤버들의 총 연봉
    const activeMembers = members.filter((m) => m.is_active && m.is_approved);
    const totalAnnualSalary = activeMembers.reduce((sum, m) => sum + m.annual_salary, 0);
    const totalMonthlySalary = totalAnnualSalary / 12;

    allocations.forEach((allocation: any) => {
      const member = members.find((m) => m.id === allocation.member_id);
      if (!member) return;

      // 해당 멤버의 프로젝트 스케줄
      const memberSchedules = schedules.filter(
        (s) => s.member_id === member.id && s.project_id === projectId
      );

      if (memberSchedules.length === 0) return;

      // 개인 연봉 비중
      const salaryRatio = totalAnnualSalary > 0 ? member.annual_salary / totalAnnualSalary : 0;

      // 스케줄을 월별로 그룹화
      const schedulesByMonth: { [yearMonth: string]: { minutes: number } } = {};
      memberSchedules.forEach((s) => {
        const yearMonth = getYearMonthFromDate(s.date);
        if (!schedulesByMonth[yearMonth]) {
          schedulesByMonth[yearMonth] = { minutes: 0 };
        }
        schedulesByMonth[yearMonth].minutes += s.minutes;
      });

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
        totalExpense += dailyTotalCost * daysInMonth;
      });
    });

    return Math.round(totalExpense);
  };

  const calculateTotals = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const contractAmount = project?.contract_amount || 0;

    // 실제 지출 총액 계산
    const totalExpense = calculateProjectExpense(projectId);

    // 영업이익 = 계약금 - 지출총액
    const operatingProfit = contractAmount - totalExpense;
    const profitRate =
      contractAmount > 0 ? ((operatingProfit / contractAmount) * 100).toFixed(0) : '0';

    return {
      totalExpense,
      operatingProfit,
      profitRate,
    };
  };

  // 정산 완료/취소 핸들러
  const handleSettleToggle = async (projectId: string, isSettled: boolean) => {
    try {
      if (isSettled) {
        if (!confirm('정산 완료를 취소하시겠습니까?')) return;
        await unsettleProject(projectId);
      } else {
        if (!confirm('정산 완료 처리하시겠습니까?\n\n정산 완료된 프로젝트는 성과 페이지에 반영됩니다.')) return;
        await settleProject(projectId);
      }

      // 프로젝트 목록 업데이트
      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, is_settled: !isSettled, settled_at: !isSettled ? new Date().toISOString() : null }
          : p
      ));
    } catch (error) {
      console.error('정산 처리 실패:', error);
      alert('정산 처리에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="정산" description="프로젝트에 대한 정산 취합입니다." />

      <FilterBar onSearch={() => console.log('Search')}>
        <FilterSelect
          label=""
          value={selectedYear}
          onChange={setSelectedYear}
          options={[
            { value: '2025', label: '2025' },
            { value: '2024', label: '2024' },
          ]}
        />
        <FilterSelect
          label=""
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { value: '진행상태 - 전체', label: '진행상태 - 전체' },
            { value: 'planning', label: '진행예정' },
            { value: 'inprogress', label: '진행중' },
            { value: 'completed', label: '완료' },
          ]}
        />
        <FilterSelect
          label=""
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { value: '구분 - 전체', label: '구분 - 전체' },
            ...projectCategories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterInput
          type="search"
          placeholder="프로젝트 검색"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </FilterBar>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">프로젝트명</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-44">
                계약기간
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24 whitespace-nowrap">남은기간</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">현황</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-28">유형</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">계약금</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                지출총액
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-36">
                영업이익 (%)
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                  정산
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => {
              const totals = calculateTotals(project.id);
              const category = projectCategories.find((c) => c.id === project.category_id);
              const remainingDays = getRemainingDays(project.end_date);

              return (
                <tr key={project.id} className={`hover:bg-gray-50 ${getRemainingDaysBgColor(remainingDays)}`}>
                  {/* 프로젝트명 + 별표 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-gray-400 hover:text-yellow-500 transition-colors">
                        <Star className="w-4 h-4" />
                      </button>
                      <span className="text-gray-700">{project.name}</span>
                    </div>
                  </td>

                  {/* 계약기간 */}
                  <td className="px-4 py-3 text-center text-gray-700 text-xs">
                    {format(new Date(project.start_date), 'yyyy/MM/dd')} ~{' '}
                    {format(new Date(project.end_date), 'yyyy/MM/dd')}
                  </td>

                  {/* 남은기간 */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm ${getRemainingDaysColor(remainingDays)}`}>
                      {getRemainingDaysText(remainingDays)}
                    </span>
                  </td>

                  {/* 현황 */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </td>

                  {/* 유형 */}
                  <td className="px-4 py-3 text-center text-gray-700">
                    {category?.name || '-'}
                  </td>

                  {/* 계약금 */}
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">
                    {project.contract_amount.toLocaleString()}원
                  </td>

                  {/* 지출총액 */}
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">
                    {totals.totalExpense.toLocaleString()}원
                  </td>

                  {/* 영업이익 (금액 + %) */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-bold ${
                          totals.operatingProfit < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {totals.profitRate}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {totals.operatingProfit.toLocaleString()}원
                      </span>
                    </div>
                  </td>

                  {/* 정산완료 버튼 - 관리자만 표시 */}
                  {isAdmin && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSettleToggle(project.id, project.is_settled)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          project.is_settled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {project.is_settled ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            완료
                          </span>
                        ) : (
                          '정산'
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-600">* 모든 금액은 부가세 별도 기준입니다.</p>

      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedProjectId(null);
          }}
          projectId={selectedProjectId}
          projects={projects}
          receipts={receipts}
        />
      )}
    </div>
  );
}

// Receipt Modal Component
function ReceiptModal({
  isOpen,
  onClose,
  projectId,
  projects,
  receipts,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  projects: Project[];
  receipts: Receipt[];
}) {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedProject, setSelectedProject] = useState(projectId || '전체');

  const projectReceipts = projectId
    ? receipts.filter((r) => r.project_id === projectId)
    : receipts;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="잔금·입금 내역 입력" size="xl">
      <div className="space-y-6">
        <div className="flex gap-4">
          <FilterSelect
            label="연도"
            value={selectedYear}
            onChange={setSelectedYear}
            options={[
              { value: '2025', label: '2025' },
              { value: '2024', label: '2024' },
            ]}
          />
          <FilterSelect
            label="프로젝트"
            value={selectedProject}
            onChange={setSelectedProject}
            options={[
              { value: '전체', label: '전체' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>

        {/* Add Receipt Form */}
        <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              입금일자*
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트명*
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">입금액*</label>
            <input
              type="number"
              placeholder="입금액을 입력해 주세요."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <input
              type="text"
              placeholder="비고를 입력해 주세요."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        {/* Receipt List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">입금일자</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  프로젝트명
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">입금액</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">비고</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projectReceipts.map((receipt) => {
                const project = projects.find((p) => p.id === receipt.project_id);
                return (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{receipt.date}</td>
                    <td className="px-4 py-3 text-gray-700">{project?.name || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      ₩{receipt.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{receipt.memo || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <SaveButton onClick={() => console.log('Save')} />
                        <DeleteButton onClick={() => console.log('Delete')} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
