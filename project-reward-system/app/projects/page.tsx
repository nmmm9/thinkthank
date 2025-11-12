'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect, FilterInput } from '@/components/FilterBar';
import { AddButton, EditButton } from '@/components/ActionButtons';
import Modal from '@/components/Modal';
import { projects, projectCategories, members, teams } from '@/mocks/data';
import { Project } from '@/types';
import { differenceInDays, format } from 'date-fns';
import { CheckCircle, XCircle, Users } from 'lucide-react';

export default function ProjectsPage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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

  const getPaymentStageColor = (stage: string | null | undefined) => {
    if (!stage) return '';
    const colors: Record<string, string> = {
      선금: 'bg-yellow-100 text-yellow-700',
      중도금: 'bg-blue-100 text-blue-700',
      잔금: 'bg-purple-100 text-purple-700',
      완료: 'bg-green-100 text-green-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  const calculateExecutionRate = (project: Project) => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();

    if (today < start) return 0;
    if (today > end) return 100;

    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);

    return Math.round((elapsed / total) * 100);
  };

  const calculateRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    return differenceInDays(end, today);
  };

  return (
    <div>
      <PageHeader
        title="프로젝트"
        description="회사에서 받고 있는 프로젝트 목록입니다."
        action={<AddButton onClick={() => setShowAddModal(true)} label="추가" />}
      />

      <FilterBar onSearch={() => console.log('Search')}>
        <FilterSelect
          label="연도"
          value={selectedYear}
          onChange={setSelectedYear}
          options={[
            { value: '전체', label: '전체' },
            { value: '2025', label: '2025' },
            { value: '2024', label: '2024' },
          ]}
        />
        <FilterSelect
          label="진행상태"
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { value: '전체', label: '전체' },
            { value: 'planning', label: '진행예정' },
            { value: 'inprogress', label: '진행중' },
            { value: 'completed', label: '완료' },
            { value: 'paused', label: '취소' },
          ]}
        />
        <FilterSelect
          label="구분"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { value: '전체', label: '전체' },
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
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">계약일자</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">계약종료일자</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">구분</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">현태</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">입금단계</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">팀원배정</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">계약금</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">직접비</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">기술료</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-48">밸런스</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">수정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => {
              const executionRate = calculateExecutionRate(project);
              const remainingDays = calculateRemainingDays(project.endDate);
              const category = projectCategories.find((c) => c.id === project.categoryId);
              const team = teams.find((t) => t.id === project.teamId);
              const allocations = project.memberAllocations || [];

              return (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{project.name}</td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {format(new Date(project.startDate), 'yyyy-MM-dd')}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {format(new Date(project.endDate), 'yyyy-MM-dd')}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {category?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {project.paymentStage ? (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStageColor(
                          project.paymentStage
                        )}`}
                      >
                        {project.paymentStage}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {allocations.length > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-700">{allocations.length}명</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    ₩{project.contractAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {project.directCosts ? `₩${project.directCosts.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {project.marginAmount ? `₩${project.marginAmount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {allocations.length > 0 ? (
                      <div className="space-y-2">
                        {allocations.map((allocation) => {
                          const member = members.find((m) => m.id === allocation.memberId);
                          return (
                            <div
                              key={allocation.memberId}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-gray-600 w-16 truncate">
                                {member?.name || '?'}
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${allocation.balancePercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-10 text-right">
                                {allocation.balancePercent}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-xs">미배정</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EditButton
                      onClick={() => {
                        setSelectedProject(project);
                        setShowEditModal(true);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <ProjectModal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
        />
      )}
    </div>
  );
}

// Project Modal Component
function ProjectModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [memberAllocations, setMemberAllocations] = useState<
    Array<{ memberId: string; balancePercent: number }>
  >(project?.memberAllocations || []);

  const addMemberAllocation = () => {
    setMemberAllocations([...memberAllocations, { memberId: '', balancePercent: 0 }]);
  };

  const removeMemberAllocation = (index: number) => {
    setMemberAllocations(memberAllocations.filter((_, i) => i !== index));
  };

  const updateMemberAllocation = (
    index: number,
    field: 'memberId' | 'balancePercent',
    value: string | number
  ) => {
    const updated = [...memberAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setMemberAllocations(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? '프로젝트 수정' : '프로젝트 추가'}
      size="lg"
    >
      <div className="space-y-6">
        {currentStep === 0 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트 명*
                </label>
                <input
                  type="text"
                  placeholder="프로젝트 명을 입력해 주세요."
                  defaultValue={project?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트 구분*
                </label>
                <select
                  defaultValue={project?.categoryId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">선택</option>
                  {projectCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트 상태*
                </label>
                <select
                  defaultValue={project?.status}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="planning">진행예정</option>
                  <option value="inprogress">진행중</option>
                  <option value="completed">완료</option>
                  <option value="paused">취소</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  입금 단계
                </label>
                <select
                  defaultValue={project?.paymentStage || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">미정</option>
                  <option value="선금">선금</option>
                  <option value="중도금">중도금</option>
                  <option value="잔금">잔금</option>
                  <option value="완료">완료</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약일자*
                </label>
                <input
                  type="date"
                  defaultValue={project?.startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약종료일자*
                </label>
                <input
                  type="date"
                  defaultValue={project?.endDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약금액
                </label>
                <input
                  type="number"
                  placeholder="0"
                  defaultValue={project?.contractAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직접비
                </label>
                <input
                  type="number"
                  placeholder="0"
                  defaultValue={project?.directCosts}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기술료/마진
                </label>
                <input
                  type="number"
                  placeholder="0"
                  defaultValue={project?.marginAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* 팀원 배정 섹션 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">팀원 배정</label>
                <button
                  onClick={addMemberAllocation}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-2">
                {memberAllocations.map((allocation, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={allocation.memberId}
                      onChange={(e) =>
                        updateMemberAllocation(index, 'memberId', e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">팀원 선택</option>
                      {members
                        .filter((m) => m.isActive && m.isApproved)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      value={allocation.balancePercent}
                      onChange={(e) =>
                        updateMemberAllocation(
                          index,
                          'balancePercent',
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="배분 %"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      onClick={() => removeMemberAllocation(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {memberAllocations.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    팀원을 배정해주세요.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between pt-4">
          <button
            onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            PREVIOUS
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              삭제
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
