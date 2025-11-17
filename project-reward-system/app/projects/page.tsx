'use client';

import { useState } from 'react';
import { projects, projectCategories } from '@/mocks/data';
import { differenceInDays, format } from 'date-fns';
import { Star, Search } from 'lucide-react';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [starredProjects, setStarredProjects] = useState<Record<string, boolean>>(
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p.starred || false }), {})
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const itemsPerPage = 10;

  // 즐겨찾기 토글
  const toggleStar = (projectId: string) => {
    setStarredProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // 실행률 계산 (시작일부터 오늘까지 / 전체 기간)
  const calculateExecutionRate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (today < start) return 0;
    if (today > end) {
      const total = differenceInDays(end, start);
      const elapsed = differenceInDays(today, start);
      return Math.round((elapsed / total) * 100);
    }

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

  // 검색 필터링
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 페이지네이션
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjects = filteredProjects.slice(startIndex, endIndex);

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">프로젝트</h1>
        <p className="text-sm text-gray-600">참여 프로젝트 목록입니다.</p>
      </div>

      {/* 추가하기 버튼 */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          + 프로젝트 추가하기
        </button>
      </div>

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

      {/* 테이블 */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentProjects.map((project) => {
              const category = projectCategories.find((c) => c.id === project.categoryId);
              const executionRate = calculateExecutionRate(project.startDate, project.endDate);
              const isStarred = starredProjects[project.id];

              return (
                <tr key={project.id} className="hover:bg-gray-50">
                  {/* 즐겨찾기 */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleStar(project.id)}
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
                    {format(new Date(project.startDate), 'yyyy/MM/dd')} ~{' '}
                    {format(new Date(project.endDate), 'yyyy/MM/dd')}
                  </td>

                  {/* 계약금 */}
                  <td className="px-4 py-3 text-right text-gray-700">
                    {project.contractAmount > 0
                      ? `${project.contractAmount.toLocaleString()}원`
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lt;
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page as number)}
              className={`px-3 py-1 rounded transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt;
        </button>
      </div>

      {/* 프로젝트 추가 모달 */}
      {showAddModal && (
        <ProjectAddModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// 프로젝트 추가 모달 컴포넌트
function ProjectAddModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [projectPM, setProjectPM] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState('50');
  const [midPaymentPercent, setMidPaymentPercent] = useState('');
  const [finalPaymentPercent, setFinalPaymentPercent] = useState('50');

  // 팀원 배정
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    name: string;
    startDate: string;
    mm: string;
    endDate: string;
    cost: string;
  }>>([]);

  // 직접비
  const [directCosts, setDirectCosts] = useState<Array<{
    category: string;
    amount: string;
  }>>([]);

  // 기술료
  const [techFeeRate, setTechFeeRate] = useState('15');
  const [roundingMethod, setRoundingMethod] = useState('반올림');
  const [memo, setMemo] = useState('');

  // 팀원 추가
  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { id: '', name: '', startDate: '', mm: '', endDate: '', cost: '' },
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
    return sum + (parseInt(member.cost) || 0);
  }, 0);

  // 직접비 총합
  const totalDirectCost = directCosts.reduce((sum, cost) => {
    return sum + (parseInt(cost.amount) || 0);
  }, 0);

  // 기술료 계산
  const techFee = Math.round(totalMemberCost * (parseInt(techFeeRate) / 100));

  // 총 투입공수 계산 (M/M 합계)
  const totalMM = teamMembers.reduce((sum, member) => {
    return sum + (parseFloat(member.mm) || 0);
  }, 0);

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
                <option value="비딩 / 선행">비딩 / 선행</option>
                <option value="진행">진행</option>
                <option value="완료">완료</option>
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

          {/* 계약금액 입금 방식 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              계약금액 입금 방식
            </label>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={`선금 ${downPaymentPercent}%`}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setDownPaymentPercent(val);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={midPaymentPercent ? `중도금 ${midPaymentPercent}%` : '중도금'}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setMidPaymentPercent(val);
                }}
                placeholder="중도금"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={`완수금 ${finalPaymentPercent}%`}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFinalPaymentPercent(val);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.map((member, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-6 gap-3 items-center bg-gray-50 p-3 rounded-lg"
                  >
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[index].name = e.target.value;
                        setTeamMembers(updated);
                      }}
                      placeholder="이름"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={member.startDate}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[index].startDate = e.target.value;
                        setTeamMembers(updated);
                      }}
                      placeholder="투입일"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={member.mm}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[index].mm = e.target.value;
                        setTeamMembers(updated);
                      }}
                      placeholder="M/M"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={member.endDate}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[index].endDate = e.target.value;
                        setTeamMembers(updated);
                      }}
                      placeholder="투입 종료"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={member.cost}
                      onChange={(e) => {
                        const updated = [...teamMembers];
                        updated[index].cost = e.target.value;
                        setTeamMembers(updated);
                      }}
                      placeholder="투입 비용"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeTeamMember(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      삭제
                    </button>
                  </div>
                ))}
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
            삭제
          </button>
          <button
            onClick={() => {
              // 저장 로직
              console.log('프로젝트 저장');
              onClose();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
