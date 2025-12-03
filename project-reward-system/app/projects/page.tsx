'use client';

import { useState, useEffect } from 'react';
import { getProjects, getProjectCategories, toggleProjectStar, updateProject, createProject, getMembers, getOpexList, setProjectAllocations } from '@/lib/api';
import type { Project, ProjectCategory, MemberWithRelations, Opex } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/auth-store';
import { differenceInDays, format, addDays } from 'date-fns';
import { Star, Search, Edit2 } from 'lucide-react';
import { getWorkingDaysInMonth, getYearMonthFromDate, addWorkingDays, getWorkingDaysBetween } from '@/lib/utils/workdays';

// 확장된 프로젝트 타입
interface ProjectWithRelations extends Project {
  category?: ProjectCategory | null;
  allocations?: Array<{
    member_id: string;
    member?: { id: string; name: string } | null;
  }>;
}

export default function ProjectsPage() {
  const { member } = useAuthStore();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [opexes, setOpexes] = useState<Opex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [starredProjects, setStarredProjects] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);

  // 관리자 권한 체크 (admin 또는 manager만 추가/수정 가능)
  const canManageProject = member?.role === 'admin' || member?.role === 'manager';

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [projectsData, categoriesData, membersData, opexData] = await Promise.all([
          getProjects(),
          getProjectCategories(),
          getMembers(),
          getOpexList(),
        ]);
        setProjects(projectsData as ProjectWithRelations[]);
        setProjectCategories(categoriesData);
        setMembers(membersData);
        setOpexes(opexData);

        // 즐겨찾기 상태 초기화
        const starredState = (projectsData as ProjectWithRelations[]).reduce(
          (acc, p) => ({ ...acc, [p.id]: p.starred || false }),
          {}
        );
        setStarredProjects(starredState);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 즐겨찾기 토글
  const handleToggleStar = async (projectId: string) => {
    const newStarred = !starredProjects[projectId];
    setStarredProjects((prev) => ({
      ...prev,
      [projectId]: newStarred,
    }));

    try {
      await toggleProjectStar(projectId, newStarred);
    } catch (error) {
      console.error('즐겨찾기 변경 실패:', error);
      // 실패 시 롤백
      setStarredProjects((prev) => ({
        ...prev,
        [projectId]: !newStarred,
      }));
    }
  };

  // 실행률 계산 (시작일부터 오늘까지 / 전체 기간)
  const calculateExecutionRate = (startDate: string, endDate: string, status: string) => {
    // 완료된 프로젝트는 100%
    if (status === 'completed') return 100;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    // 시작 전이면 0%
    if (today < start) return 0;
    // 종료일이 지났으면 100%
    if (today > end) return 100;

    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);

    return Math.round((elapsed / total) * 100);
  };

  // 현황 태그 라벨 및 색상
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: '학습 & 진행중',
      inprogress: '진행',
      completed: '완료',
      paused: '비즈 / 팀장',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-green-100 text-green-700',
      inprogress: 'bg-green-100 text-green-700',
      completed: 'bg-green-100 text-green-700',
      paused: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // 프로젝트 수정 핸들러
  const handleEditProject = (project: ProjectWithRelations) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  // 프로젝트 수정 후 목록 갱신
  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
    );
    setShowEditModal(false);
    setSelectedProject(null);
  };

  // 검색 필터링
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 본인이 속한 프로젝트인지 확인
  const isMyProject = (project: ProjectWithRelations) => {
    if (!member) return false;
    return project.allocations?.some((alloc) => alloc.member_id === member.id) || false;
  };

  // 진행중인 프로젝트 (planning, inprogress, paused)
  const activeProjects = filteredProjects.filter((p) => p.status !== 'completed');
  // 완료된 프로젝트
  const completedProjects = filteredProjects.filter((p) => p.status === 'completed');

  // 진행중 프로젝트 중 내가 속한 프로젝트
  const myActiveProjects = activeProjects.filter((p) => isMyProject(p));
  // 진행중 프로젝트 중 내가 속하지 않은 프로젝트
  const otherActiveProjects = activeProjects.filter((p) => !isMyProject(p));

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">프로젝트</h1>
        <p className="text-sm text-gray-600">참여 프로젝트 목록입니다.</p>
      </div>

      {/* 추가하기 버튼 - 관리자/팀관리자만 표시 */}
      {canManageProject && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            + 프로젝트 추가하기
          </button>
        </div>
      )}

      {/* 검색바 */}
      <div className="flex justify-end mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="프로젝트 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
          />
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Search className="w-4 h-4" />
            검색
          </button>
        </div>
      </div>

      {/* 내가 참여중인 프로젝트 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          내가 참여중인 프로젝트
          <span className="text-sm font-normal text-gray-500">({myActiveProjects.length})</span>
        </h2>
        {myActiveProjects.length > 0 ? (
          <ProjectTable
            projects={myActiveProjects}
            projectCategories={projectCategories}
            starredProjects={starredProjects}
            canManageProject={canManageProject}
            onToggleStar={handleToggleStar}
            onEditProject={handleEditProject}
            calculateExecutionRate={calculateExecutionRate}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            참여중인 프로젝트가 없습니다.
          </div>
        )}
      </div>

      {/* 기타 진행중인 프로젝트 */}
      {otherActiveProjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            기타 진행중인 프로젝트
            <span className="text-sm font-normal text-gray-500">({otherActiveProjects.length})</span>
          </h2>
          <ProjectTable
            projects={otherActiveProjects}
            projectCategories={projectCategories}
            starredProjects={starredProjects}
            canManageProject={canManageProject}
            onToggleStar={handleToggleStar}
            onEditProject={handleEditProject}
            calculateExecutionRate={calculateExecutionRate}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        </div>
      )}

      {/* 완료된 프로젝트 */}
      {completedProjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            완료된 프로젝트
            <span className="text-sm font-normal text-gray-500">({completedProjects.length})</span>
          </h2>
          <ProjectTable
            projects={completedProjects}
            projectCategories={projectCategories}
            starredProjects={starredProjects}
            canManageProject={canManageProject}
            onToggleStar={handleToggleStar}
            onEditProject={handleEditProject}
            calculateExecutionRate={calculateExecutionRate}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        </div>
      )}

      {/* 프로젝트가 없을 때 */}
      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          프로젝트가 없습니다.
        </div>
      )}

      {/* 프로젝트 추가 모달 */}
      {showAddModal && (
        <ProjectFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          projectCategories={projectCategories}
          members={members}
          opexes={opexes}
          onSave={(project) => {
            setProjects((prev) => [project, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}

      {/* 프로젝트 수정 모달 */}
      {showEditModal && selectedProject && (
        <ProjectFormModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          projectCategories={projectCategories}
          members={members}
          opexes={opexes}
          project={selectedProject}
          onSave={handleProjectUpdated}
        />
      )}
    </div>
  );
}

// 프로젝트 테이블 컴포넌트
function ProjectTable({
  projects,
  projectCategories,
  starredProjects,
  canManageProject,
  onToggleStar,
  onEditProject,
  calculateExecutionRate,
  getStatusLabel,
  getStatusColor,
}: {
  projects: ProjectWithRelations[];
  projectCategories: ProjectCategory[];
  starredProjects: Record<string, boolean>;
  canManageProject: boolean;
  onToggleStar: (projectId: string) => void;
  onEditProject: (project: ProjectWithRelations) => void;
  calculateExecutionRate: (startDate: string, endDate: string, status: string) => number;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-center font-medium text-gray-700 w-12"></th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">프로젝트명</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">현황</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">유형</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700 w-64">계약기간</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">계약금</th>
            <th className="px-4 py-3 text-center font-medium text-gray-700 w-48">실행률</th>
            {canManageProject && (
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">관리</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {projects.map((project) => {
            const category = project.category || projectCategories.find((c) => c.id === project.category_id);
            const executionRate = calculateExecutionRate(project.start_date, project.end_date, project.status);
            const isStarred = starredProjects[project.id];

            return (
              <tr key={project.id} className="hover:bg-gray-50">
                {/* 즐겨찾기 */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onToggleStar(project.id)}
                    className="text-gray-400 hover:text-yellow-500 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        isStarred ? 'fill-yellow-400 text-yellow-400' : ''
                      }`}
                    />
                  </button>
                </td>

                {/* 프로젝트명 */}
                <td className="px-4 py-3 text-gray-900">{project.name}</td>

                {/* 현황 */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
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

                {/* 계약기간 */}
                <td className="px-4 py-3 text-center text-gray-700">
                  {format(new Date(project.start_date), 'yyyy/MM/dd')} ~{' '}
                  {format(new Date(project.end_date), 'yyyy/MM/dd')}
                </td>

                {/* 계약금 */}
                <td className="px-4 py-3 text-right text-gray-700">
                  {project.contract_amount > 0
                    ? `${project.contract_amount.toLocaleString()}원`
                    : '0원'}
                </td>

                {/* 실행률 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          executionRate > 100 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${Math.min(executionRate, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium w-12 text-right ${
                        executionRate > 100 ? 'text-red-600' : 'text-gray-700'
                      }`}
                    >
                      {executionRate}%
                    </span>
                  </div>
                </td>

                {/* 관리 - 관리자/팀관리자만 표시 */}
                {canManageProject && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onEditProject(project)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 프로젝트 추가/수정 모달 컴포넌트
function ProjectFormModal({
  isOpen,
  onClose,
  projectCategories,
  members,
  opexes,
  project,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  projectCategories: ProjectCategory[];
  members: MemberWithRelations[];
  opexes: Opex[];
  project?: Project | null;
  onSave: (project: Project) => void;
}) {
  const { member: authMember } = useAuthStore();
  const isEditMode = !!project;
  const [isSaving, setIsSaving] = useState(false);

  const [projectName, setProjectName] = useState(project?.name || '');
  const [projectType, setProjectType] = useState(project?.category_id || '');
  const [projectStatus, setProjectStatus] = useState(project?.status || '');
  const [projectPM, setProjectPM] = useState(project?.contact_name || '');
  const [contractStartDate, setContractStartDate] = useState(project?.start_date || '');
  const [contractEndDate, setContractEndDate] = useState(project?.end_date || '');
  const [projectStartDate, setProjectStartDate] = useState(project?.start_date || '');
  const [projectEndDate, setProjectEndDate] = useState(project?.end_date || '');
  const [contractAmount, setContractAmount] = useState(project?.contract_amount?.toString() || '');

  // 활성 팀원 목록
  const activeMembers = members.filter((m) => m.is_active && m.is_approved);

  // 전체 연봉 합계
  const totalAnnualSalary = activeMembers.reduce((sum, m) => sum + m.annual_salary, 0);
  const totalMonthlySalary = totalAnnualSalary / 12;

  // 팀원 배정 타입
  type TeamMemberAllocation = {
    memberId: string;
    startDate: string;
    days: string;
    endDate: string;
    dailySalaryCost: number;
    dailyOpexCost: number;
    dailyTotalCost: number;
    cost: number;
  };

  // 기존 프로젝트의 팀원 배정 데이터 초기화
  const getInitialTeamMembers = (): TeamMemberAllocation[] => {
    // allocations는 API에서 조인된 데이터
    const allocations = (project as any)?.allocations;
    if (!allocations || allocations.length === 0) return [];

    return allocations.map((alloc: any) => {
      const memberId = alloc.member_id || '';
      const startDate = alloc.start_date || project?.start_date || '';
      const days = alloc.planned_days?.toString() || '';
      const endDate = alloc.end_date || project?.end_date || '';

      // 비용 계산
      let dailySalaryCost = 0;
      let dailyOpexCost = 0;
      let dailyTotalCost = 0;
      let cost = alloc.allocated_amount || 0;

      if (memberId && startDate) {
        const member = activeMembers.find((m) => m.id === memberId);
        if (member) {
          const date = new Date(startDate);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const workingDaysInMonth = getWorkingDaysInMonth(year, month);

          const salaryRatio = totalAnnualSalary > 0 ? member.annual_salary / totalAnnualSalary : 0;
          const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
          const monthOpex = opexes.find((o) => o.year_month === yearMonth);
          const opexAmount = monthOpex?.amount || opexes[0]?.amount || 0;

          // 판관비 = 운영비 - 전체 월급
          const adminExpense = Math.max(0, opexAmount - totalMonthlySalary);

          // 1일 1인 판관비 = 판관비 × 연봉비중 / 해당월 근무일수
          dailyOpexCost = workingDaysInMonth > 0
            ? Math.round((adminExpense * salaryRatio) / workingDaysInMonth)
            : 0;
          dailySalaryCost = workingDaysInMonth > 0
            ? Math.round((member.annual_salary / 12) / workingDaysInMonth)
            : 0;
          dailyTotalCost = dailySalaryCost + dailyOpexCost;

          // cost가 없으면 계산
          if (!cost && days) {
            cost = dailyTotalCost * (parseInt(days) || 0);
          }
        }
      }

      return {
        memberId,
        startDate,
        days,
        endDate,
        dailySalaryCost,
        dailyOpexCost,
        dailyTotalCost,
        cost,
      };
    });
  };

  const [teamMembers, setTeamMembers] = useState<TeamMemberAllocation[]>(getInitialTeamMembers());

  // 운영비 부족 월 체크 함수
  const checkOpexShortage = (startDate: string): { isShort: boolean; yearMonth: string; shortage: number } | null => {
    if (!startDate) return null;

    const date = new Date(startDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    const monthOpex = opexes.find((o) => o.year_month === yearMonth);
    const opexAmount = monthOpex?.amount || 0;

    if (opexAmount < totalMonthlySalary) {
      return {
        isShort: true,
        yearMonth,
        shortage: totalMonthlySalary - opexAmount,
      };
    }
    return null;
  };

  // 팀원 배정 중 운영비 부족 월 목록
  const opexShortageMonths = teamMembers
    .filter((m) => m.startDate)
    .map((m) => checkOpexShortage(m.startDate))
    .filter((result): result is { isShort: boolean; yearMonth: string; shortage: number } => result !== null && result.isShort);

  // 중복 제거
  const uniqueShortageMonths = opexShortageMonths.reduce((acc, curr) => {
    if (!acc.find((item) => item.yearMonth === curr.yearMonth)) {
      acc.push(curr);
    }
    return acc;
  }, [] as typeof opexShortageMonths);

  // 직접비
  const [directCosts, setDirectCosts] = useState<Array<{
    category: string;
    amount: string;
  }>>([]);

  // 기술료
  const [techFeeRate, setTechFeeRate] = useState('15');
  const [roundingMethod, setRoundingMethod] = useState('반올림');
  const [memo, setMemo] = useState(project?.memo || '');
  const [companySharePercent, setCompanySharePercent] = useState(
    (project as any)?.company_share_percent?.toString() || '80'
  );

  // 1일 투입비용 상세 계산 함수
  const calculateDailyCostDetails = (memberId: string, startDate: string) => {
    const member = activeMembers.find((m) => m.id === memberId);
    if (!member || !startDate) return { dailySalaryCost: 0, dailyOpexCost: 0, dailyTotalCost: 0 };

    const date = new Date(startDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const workingDaysInMonth = getWorkingDaysInMonth(year, month);

    // 개인 연봉 비중
    const salaryRatio = totalAnnualSalary > 0 ? member.annual_salary / totalAnnualSalary : 0;

    // 해당 월의 운영비
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const monthOpex = opexes.find((o) => o.year_month === yearMonth);
    const opexAmount = monthOpex?.amount || opexes[0]?.amount || 0;

    // 판관비 = 운영비 - 전체 월급
    const adminExpense = Math.max(0, opexAmount - totalMonthlySalary);

    // 1일 1인 판관비 = 판관비 × 연봉비중 / 해당월 근무일수
    const dailyOpexCost = workingDaysInMonth > 0
      ? Math.round((adminExpense * salaryRatio) / workingDaysInMonth)
      : 0;

    // 1일 매출원가 (인건비) = 연봉 / 12 / 해당월 근무일수
    const dailySalaryCost = workingDaysInMonth > 0
      ? Math.round((member.annual_salary / 12) / workingDaysInMonth)
      : 0;

    return {
      dailySalaryCost,
      dailyOpexCost,
      dailyTotalCost: dailySalaryCost + dailyOpexCost,
    };
  };

  // 투입비용 계산 (1일 비용 × 투입일수)
  const calculateTotalCostDetails = (memberId: string, startDate: string, days: number) => {
    const details = calculateDailyCostDetails(memberId, startDate);
    return {
      ...details,
      cost: details.dailyTotalCost * days,
    };
  };

  // 비용 상세 업데이트 헬퍼
  const updateCostDetails = (memberData: typeof teamMembers[0]) => {
    if (memberData.memberId && memberData.startDate && memberData.days) {
      const details = calculateTotalCostDetails(
        memberData.memberId,
        memberData.startDate,
        parseInt(memberData.days) || 0
      );
      memberData.dailySalaryCost = details.dailySalaryCost;
      memberData.dailyOpexCost = details.dailyOpexCost;
      memberData.dailyTotalCost = details.dailyTotalCost;
      memberData.cost = details.cost;
    } else {
      memberData.dailySalaryCost = 0;
      memberData.dailyOpexCost = 0;
      memberData.dailyTotalCost = 0;
      memberData.cost = 0;
    }
  };

  // 팀원 선택 시 처리
  const handleMemberSelect = (index: number, memberId: string) => {
    const updated = [...teamMembers];
    updated[index].memberId = memberId;
    updateCostDetails(updated[index]);
    setTeamMembers(updated);
  };

  // 시작일 변경 시 처리
  const handleStartDateChange = (index: number, startDate: string) => {
    const updated = [...teamMembers];
    updated[index].startDate = startDate;

    // 투입일수(근무일)가 있으면 종료일 계산
    if (updated[index].days) {
      const days = parseInt(updated[index].days) || 0;
      if (days > 0) {
        const endDate = addWorkingDays(new Date(startDate), days);
        updated[index].endDate = format(endDate, 'yyyy-MM-dd');
      }
    }

    updateCostDetails(updated[index]);
    setTeamMembers(updated);
  };

  // 투입일수 변경 시 처리 (종료일 자동 계산 - 근무일 기준)
  const handleDaysChange = (index: number, days: string) => {
    const updated = [...teamMembers];
    updated[index].days = days;

    // 시작일이 있으면 종료일 계산 (근무일 기준)
    if (updated[index].startDate && days) {
      const daysNum = parseInt(days) || 0;
      if (daysNum > 0) {
        const endDate = addWorkingDays(new Date(updated[index].startDate), daysNum);
        updated[index].endDate = format(endDate, 'yyyy-MM-dd');
      }
    }

    updateCostDetails(updated[index]);
    setTeamMembers(updated);
  };

  // 종료일 변경 시 처리 (투입일수 자동 계산 - 근무일 기준)
  const handleEndDateChange = (index: number, endDate: string) => {
    const updated = [...teamMembers];
    updated[index].endDate = endDate;

    // 시작일이 있으면 투입일수 계산 (근무일 기준)
    if (updated[index].startDate && endDate) {
      const start = new Date(updated[index].startDate);
      const end = new Date(endDate);
      const workingDays = getWorkingDaysBetween(start, end);
      updated[index].days = workingDays > 0 ? workingDays.toString() : '';
    }

    updateCostDetails(updated[index]);
    setTeamMembers(updated);
  };

  // 팀원 추가
  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      {
        memberId: '',
        startDate: '',
        days: '',
        endDate: '',
        dailySalaryCost: 0,
        dailyOpexCost: 0,
        dailyTotalCost: 0,
        cost: 0
      },
    ]);
  };

  // 팀원 삭제
  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  // 직접비 항목 추가
  const addDirectCost = () => {
    setDirectCosts([...directCosts, { category: '', amount: '' }]);
  };

  // 직접비 항목 삭제
  const removeDirectCost = (index: number) => {
    setDirectCosts(directCosts.filter((_, i) => i !== index));
  };

  // 총 투입비용 계산 (팀원 투입비용 합계)
  const totalMemberCost = teamMembers.reduce((sum, member) => {
    return sum + (member.cost || 0);
  }, 0);

  // 직접비 총합
  const totalDirectCost = directCosts.reduce((sum, cost) => {
    return sum + (parseInt(cost.amount) || 0);
  }, 0);

  // 기술료 계산
  const techFee = Math.round(totalMemberCost * (parseInt(techFeeRate) / 100));

  // 총 투입공수 계산 (일수 합계를 M/M으로 변환, 20일 = 1M/M)
  const totalDays = teamMembers.reduce((sum, member) => {
    return sum + (parseInt(member.days) || 0);
  }, 0);
  const totalMM = totalDays / 20;

  // 총 계약금 (VAT 별도)
  const totalContractAmount = totalMemberCost + totalDirectCost + techFee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-1">프로젝트명</div>
            <h2 className="text-xl font-bold text-gray-900">
              {projectName || '프로젝트명을 입력하세요'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ←
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-6 space-y-8">
          {/* 기본 정보 섹션 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 유형
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {projectCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 현황
              </label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                <option value="planning">비딩 / 선행</option>
                <option value="inprogress">진행</option>
                <option value="completed">완료</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 PM
              </label>
              <input
                type="text"
                value={projectPM}
                onChange={(e) => setProjectPM(e.target.value)}
                placeholder="PM 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 프로젝트명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트명
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 계약 일자 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계약 일자
              </label>
              <input
                type="date"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                계약 종료일자
              </label>
              <input
                type="date"
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 계약금 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              계약금
            </label>
            <input
              type="text"
              value={contractAmount ? parseInt(contractAmount).toLocaleString() : ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setContractAmount(val);
              }}
              placeholder="계약금을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 총 투입비용 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">총 투입비용 (인건비 + 판관비)</div>
            <div className="text-3xl font-bold text-blue-600">
              {totalMemberCost.toLocaleString()}원
            </div>
          </div>

          {/* 프로젝트 시작/종료 일자 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 시작일자
              </label>
              <input
                type="date"
                value={projectStartDate}
                onChange={(e) => setProjectStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 종료일자
              </label>
              <input
                type="date"
                value={projectEndDate}
                onChange={(e) => setProjectEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 팀원 배정 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">팀원 배정</h3>
              <button
                onClick={addTeamMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                + 팀원 추가
              </button>
            </div>

            {/* 운영비 부족 경고 */}
            {uniqueShortageMonths.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 text-xl">⚠️</div>
                  <div>
                    <div className="font-semibold text-red-700 mb-2">
                      운영비가 부족합니다!
                    </div>
                    <div className="text-sm text-red-600 space-y-1">
                      {uniqueShortageMonths.map((item) => (
                        <div key={item.yearMonth}>
                          <span className="font-medium">{item.yearMonth}</span>:
                          운영비가 인건비보다 <span className="font-bold">{Math.round(item.shortage).toLocaleString()}원</span> 부족합니다.
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-red-700">
                      👉 <a href="/settings/opex" className="underline font-medium hover:text-red-800">운영비 설정</a>에서 해당 월의 운영비를 추가해주세요.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.map((member, index) => {
                  const selectedMember = activeMembers.find((m) => m.id === member.memberId);
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      {/* 상단: 팀원 선택 및 기간 입력 */}
                      <div className="grid grid-cols-5 gap-3 items-center mb-3">
                        {/* 팀원 선택 드롭다운 */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">팀원</label>
                          <select
                            value={member.memberId}
                            onChange={(e) => handleMemberSelect(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                          >
                            <option value="">팀원 선택</option>
                            {activeMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.team?.name || '팀 없음'})
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* 투입 시작일 */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">투입 시작일</label>
                          <input
                            type="date"
                            value={member.startDate}
                            onChange={(e) => handleStartDateChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        {/* 투입일수 */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">투입일수</label>
                          <input
                            type="number"
                            value={member.days}
                            onChange={(e) => handleDaysChange(index, e.target.value)}
                            placeholder="일수"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        {/* 투입 종료일 */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">투입 종료일</label>
                          <input
                            type="date"
                            value={member.endDate}
                            onChange={(e) => handleEndDateChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        {/* 삭제 버튼 */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeTeamMember(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      {/* 하단: 비용 상세 정보 */}
                      {member.memberId && member.startDate && member.days && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            {/* 1일 인건비 */}
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">1일 인건비</div>
                              <div className="font-medium text-gray-700">
                                {member.dailySalaryCost.toLocaleString()}원
                              </div>
                            </div>
                            {/* 1일 판관비 */}
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">1일 판관비</div>
                              <div className="font-medium text-gray-700">
                                {member.dailyOpexCost.toLocaleString()}원
                              </div>
                            </div>
                            {/* 1일 총 비용 */}
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">1일 총 비용</div>
                              <div className="font-medium text-gray-900">
                                {member.dailyTotalCost.toLocaleString()}원
                              </div>
                            </div>
                            {/* 총 투입비용 */}
                            <div className="text-center bg-blue-50 rounded-lg py-1">
                              <div className="text-xs text-blue-600 mb-1">총 투입비용 ({member.days}일)</div>
                              <div className="font-bold text-blue-700 text-lg">
                                {member.cost.toLocaleString()}원
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                팀원을 추가해주세요
              </div>
            )}
          </div>

          {/* 직접비 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                직접비 (외주 등)
              </h3>
              <div className="text-xl font-bold text-blue-600">
                {totalDirectCost.toLocaleString()}원
              </div>
            </div>

            <div className="space-y-3">
              {directCosts.map((cost, index) => (
                <div key={index} className="grid grid-cols-3 gap-3 items-center">
                  <input
                    type="text"
                    value={cost.category}
                    onChange={(e) => {
                      const updated = [...directCosts];
                      updated[index].category = e.target.value;
                      setDirectCosts(updated);
                    }}
                    placeholder="항목을 입력해 주세요"
                    className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={cost.amount}
                    onChange={(e) => {
                      const updated = [...directCosts];
                      updated[index].amount = e.target.value;
                      setDirectCosts(updated);
                    }}
                    placeholder="비용"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeDirectCost(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    삭제
                  </button>
                </div>
              ))}

              <button
                onClick={addDirectCost}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                + 항목 추가
              </button>
            </div>
          </div>

          {/* 기술료 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">기술료</h3>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {techFee.toLocaleString()}원
              </div>
              <div className="text-sm text-gray-600">
                기술료율: {techFeeRate}% (기술료 = 총투입비용 * 기술료율)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기술료율
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={techFeeRate}
                    onChange={(e) => setTechFeeRate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex items-center text-gray-700">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 총 투입공수 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">총 투입공수</h3>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="text-3xl font-bold text-blue-600">
                {totalMM.toFixed(2)}M/M
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  단수절리 단위
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>만원</option>
                  <option>십만원</option>
                  <option>백만원</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  방식
                </label>
                <select
                  value={roundingMethod}
                  onChange={(e) => setRoundingMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>반올림</option>
                  <option>올림</option>
                  <option>내림</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  총 계약금 (VAT별도)
                </label>
                <input
                  type="text"
                  value={`${totalContractAmount.toLocaleString()}원`}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* 성과 배분 비율 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">성과 배분 비율</h3>
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-700">회사</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={companySharePercent}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      setCompanySharePercent(val.toString());
                    }}
                    className="w-20 px-2 py-1 text-xl font-bold text-gray-900 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xl font-bold text-gray-900">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">팀원</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={100 - parseInt(companySharePercent || '0')}
                    onChange={(e) => {
                      const teamVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      setCompanySharePercent((100 - teamVal).toString());
                    }}
                    className="w-20 px-2 py-1 text-xl font-bold text-green-600 text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-xl font-bold text-green-600">%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                슬라이더로 조절
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={companySharePercent}
                onChange={(e) => setCompanySharePercent(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% (팀원 100%)</span>
                <span>50%</span>
                <span>100% (회사 100%)</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              프로젝트 완료 후 발생하는 성과를 회사와 팀원이 나누는 비율입니다.
              팀원 배분은 각 멤버의 효율(절약률)에 따라 배분됩니다.
            </p>
          </div>

          {/* 비고 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">비고</h3>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="비고사항을 입력하세요"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={async () => {
              if (!projectName.trim()) {
                alert('프로젝트명을 입력해주세요.');
                return;
              }
              if (!contractStartDate || !contractEndDate) {
                alert('계약 기간을 입력해주세요.');
                return;
              }

              // 운영비 부족 체크
              if (uniqueShortageMonths.length > 0) {
                const monthList = uniqueShortageMonths.map((m) => m.yearMonth).join(', ');
                alert(`운영비가 부족한 월이 있습니다: ${monthList}\n\n운영비 설정에서 해당 월의 운영비를 추가해주세요.`);
                return;
              }

              setIsSaving(true);
              try {
                const projectData = {
                  name: projectName,
                  category_id: projectType || null,
                  status: projectStatus || 'planning',
                  start_date: contractStartDate,
                  end_date: contractEndDate,
                  contract_amount: parseInt(contractAmount) || totalContractAmount,
                  memo: memo || null,
                  contact_name: projectPM || null,
                  company_share_percent: parseInt(companySharePercent) || 80,
                };

                let savedProject: Project;
                if (isEditMode && project) {
                  savedProject = await updateProject(project.id, projectData) as Project;
                } else {
                  // 새 프로젝트 생성 시 org_id 추가
                  savedProject = await createProject({
                    ...projectData,
                    org_id: authMember?.org_id || '',
                  } as any) as Project;
                }

                // 팀원 배정 저장
                if (savedProject && teamMembers.length > 0) {
                  const validMembers = teamMembers.filter((m) => m.memberId);
                  if (validMembers.length > 0) {
                    await setProjectAllocations(
                      savedProject.id,
                      savedProject.org_id,
                      validMembers.map((m) => ({
                        memberId: m.memberId,
                        allocatedAmount: m.cost,
                        plannedDays: parseInt(m.days) || 0,
                        startDate: m.startDate,
                        endDate: m.endDate,
                      }))
                    );
                  }
                }

                onSave(savedProject);
              } catch (error: any) {
                console.error('프로젝트 저장 실패:', error);
                console.error('에러 상세:', error?.message, error?.code, error?.details);
                alert(`프로젝트 저장에 실패했습니다.\n${error?.message || ''}`);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : (isEditMode ? '수정' : '저장')}
          </button>
        </div>
      </div>
    </div>
  );
}
