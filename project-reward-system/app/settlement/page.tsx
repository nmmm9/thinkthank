'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect, FilterInput } from '@/components/FilterBar';
import Modal from '@/components/Modal';
import { AddButton, EditButton, SaveButton, DeleteButton } from '@/components/ActionButtons';
import { projects, receipts, projectCategories } from '@/mocks/data';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Plus, Star } from 'lucide-react';

export default function SettlementPage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedStatus, setSelectedStatus] = useState('진행상태 - 전체');
  const [selectedCategory, setSelectedCategory] = useState('구분 - 전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
    if (!stage) return 'bg-gray-100 text-gray-500';
    const colors: Record<string, string> = {
      선금: 'bg-yellow-100 text-yellow-700',
      중도금: 'bg-blue-100 text-blue-700',
      잔금: 'bg-purple-100 text-purple-700',
      완료: 'bg-green-100 text-green-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  const calculateTotals = (projectId: string) => {
    const projectReceipts = receipts.filter((r) => r.projectId === projectId);
    const totalReceived = projectReceipts.reduce((sum, r) => sum + r.amount, 0);

    // 임시 지출 (실제로는 expenses에서 계산해야 함)
    const totalExpense = 0;

    const project = projects.find((p) => p.id === projectId);
    const contractAmount = project?.contractAmount || 0;

    const remainingBalance = contractAmount - totalReceived;
    const operatingProfit = contractAmount - totalExpense;
    const profitRate =
      contractAmount > 0 ? ((operatingProfit / contractAmount) * 100).toFixed(0) : '0';

    return {
      totalExpense,
      operatingProfit,
      profitRate,
      remainingBalance,
      totalReceived,
    };
  };

  // 입금 단계 태그 목록 생성 (더미 로직)
  const getPaymentStageTags = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return [];

    const tags: Array<'선금' | '중도금' | '잔금'> = [];
    const totals = calculateTotals(projectId);
    const receivedRatio = (totals.totalReceived / project.contractAmount) * 100;

    // 간단한 로직: 입금 비율에 따라 태그 추가
    if (receivedRatio > 0) tags.push('선금');
    if (receivedRatio > 30) tags.push('중도금');
    if (receivedRatio > 60) tags.push('잔금');

    return tags;
  };

  return (
    <div>
      <PageHeader title="정산" description="프로젝트에 대한 정산 취합입니다." />

      {/* 상단 안내 문구 */}
      <div className="mb-6 bg-blue-500 text-white px-6 py-3 rounded-lg inline-block">
        <p className="text-sm font-medium">프로젝트 정산 현황 및 담당자의 확인</p>
      </div>

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
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">현황</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">유형</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-40">
                계약기간
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">계약금</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-48">
                지급 총액
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-40">
                영업이익 (%)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => {
              const totals = calculateTotals(project.id);
              const category = projectCategories.find((c) => c.id === project.categoryId);
              const paymentTags = getPaymentStageTags(project.id);

              return (
                <tr key={project.id} className="hover:bg-gray-50">
                  {/* 프로젝트명 + 별표 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-gray-400 hover:text-yellow-500 transition-colors">
                        <Star className="w-4 h-4" />
                      </button>
                      <span className="text-gray-700">{project.name}</span>
                    </div>
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

                  {/* 계약기간 */}
                  <td className="px-4 py-3 text-center text-gray-700 text-xs">
                    {format(new Date(project.startDate), 'yyyy/MM/dd')} ~{' '}
                    {format(new Date(project.endDate), 'yyyy/MM/dd')}
                  </td>

                  {/* 계약금 */}
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">
                    {project.contractAmount.toLocaleString()}원
                  </td>

                  {/* 지급 총액 (여러 태그) */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {paymentTags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStageColor(
                            tag
                          )}`}
                        >
                          {tag}
                        </span>
                      ))}
                      {paymentTags.length === 0 && (
                        <span className="text-gray-400 text-xs">입금</span>
                      )}
                    </div>
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
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
}) {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedProject, setSelectedProject] = useState(projectId || '전체');

  const projectReceipts = projectId
    ? receipts.filter((r) => r.projectId === projectId)
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
                const project = projects.find((p) => p.id === receipt.projectId);
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
