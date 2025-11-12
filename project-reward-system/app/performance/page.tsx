'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect } from '@/components/FilterBar';
import { projects, teams, members, opexList, workTimeSetting } from '@/mocks/data';

export default function PerformancePage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedProject, setSelectedProject] = useState('프로젝트 - 전체');
  const [selectedTeam, setSelectedTeam] = useState('팀 - 전체');
  const [selectedMember, setSelectedMember] = useState('팀원 - 전체');

  // 계산 로직
  const calculatePerformance = (memberId: string, projectId: string) => {
    const member = members.find((m) => m.id === memberId);
    const project = projects.find((p) => p.id === projectId);

    if (!member || !project) return null;

    // 1일 매출원가 = 연봉 / (12 × 20.917)
    const dailyCost = member.annualSalary / (12 * 20.917);

    // 총 연봉 계산 (활성 멤버만)
    const totalAnnualSalary = members
      .filter((m) => m.isActive)
      .reduce((sum, m) => sum + m.annualSalary, 0);

    // 연봉 비중
    const salaryRatio = totalAnnualSalary > 0 ? member.annualSalary / totalAnnualSalary : 0;

    // 해당 연도의 운영비 (임시로 가장 최근 것 사용)
    const opex = opexList[0]?.amount || 0;

    // 근무가능일수 (연간 근무일수 - 휴일, 임시로 250일로 계산)
    const workingDays = 250;

    // 1일 판관비 = (운영비 × 연봉비중) / 근무가능일수
    const dailyOpex = (opex * salaryRatio) / workingDays;

    // 1일 투입비 = 매출원가 + 판관비
    const dailyTotalCost = dailyCost + dailyOpex;

    // 계획 참여일수 (임시로 50일)
    const plannedDays = 50;

    // 참여율 (임시로 100%)
    const participationRate = 100;

    // 참여일수(실적) - 임시로 스케줄에서 계산해야 하지만, 여기서는 211일로 임시 설정
    const actualDays = 211;

    // 팀원 계약금 (프로젝트 계약금을 팀원수로 나눔 - 실제로는 배분 데이터 사용)
    const memberContractAmount = project.contractAmount;

    // 총투입비용 = 1일 투입비 × 참여일수
    const totalInvestment = dailyTotalCost * actualDays;

    // 성과 = 팀원 계약금 - 총투입비용
    const performance = memberContractAmount - totalInvestment;

    return {
      dailyCost,
      dailyOpex,
      dailyTotalCost,
      plannedDays,
      participationRate,
      actualDays,
      memberContractAmount,
      totalInvestment,
      performance,
    };
  };

  // Mock table data
  const tableData = [
    {
      year: 2025,
      projectName: '관계',
      team: '디자인팀',
      member: '관리자',
      contractAmount: 57297245,
      plannedDays: 211.0,
      participationRate: 100,
      dailyCost: 9008985,
      dailyOpex: 1923937,
      dailyTotalCost: 10932922,
      actualDays: 205.5,
      totalInvestment: 0,
      performance: 0,
    },
  ];

  // 더미 데이터 추가
  const dummyData = projects.slice(0, 5).map((project) => {
    const member = members[0];
    const perf = calculatePerformance(member.id, project.id);

    return {
      year: 2025,
      projectName: project.name,
      team: teams[0].name,
      member: member.name,
      contractAmount: project.contractAmount,
      plannedDays: perf?.plannedDays || 0,
      participationRate: perf?.participationRate || 0,
      dailyCost: perf?.dailyCost || 0,
      dailyOpex: perf?.dailyOpex || 0,
      dailyTotalCost: perf?.dailyTotalCost || 0,
      actualDays: perf?.actualDays || 0,
      totalInvestment: perf?.totalInvestment || 0,
      performance: perf?.performance || 0,
    };
  });

  const allData = [...tableData, ...dummyData];

  return (
    <div>
      <PageHeader title="성과" description="팀원들의 프로젝트에 대한 성과를 취합입니다." />

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
          value={selectedProject}
          onChange={setSelectedProject}
          options={[
            { value: '프로젝트 - 전체', label: '프로젝트 - 전체' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <FilterSelect
          label=""
          value={selectedTeam}
          onChange={setSelectedTeam}
          options={[
            { value: '팀 - 전체', label: '팀 - 전체' },
            ...teams.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        <FilterSelect
          label=""
          value={selectedMember}
          onChange={setSelectedMember}
          options={[
            { value: '팀원 - 전체', label: '팀원 - 전체' },
            ...members.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
      </FilterBar>

      {/* Radio buttons for view mode */}
      <div className="mb-4 flex items-center gap-6 bg-white p-4 rounded-lg shadow-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="viewMode"
            value="total"
            defaultChecked
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">양적적 모아보기</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="viewMode"
            value="year"
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">연도</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="viewMode"
            value="project"
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">프로젝트</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="viewMode"
            value="team"
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">팀</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="viewMode"
            value="member"
            className="w-4 h-4 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">팀원</span>
        </label>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">년도</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">프로젝트명</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">팀</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">팀원</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                프로젝트 총계약금
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                팀 계약금
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                팀원 계약금
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                계획 참여일수
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                참여율
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                [팀원 계약금 / 팀 총]
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                1일 매출원가
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                1일 판관비
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                [1일 매출원가 + 1일 판관비]
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                참여일수(실적)
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">
                총투입비용
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 w-32">성과</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center text-gray-700">{row.year}</td>
                <td className="px-4 py-3 text-gray-700">{row.projectName}</td>
                <td className="px-4 py-3 text-center text-gray-700">{row.team}</td>
                <td className="px-4 py-3 text-center text-gray-700">{row.member}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ₩{row.contractAmount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">₩0</td>
                <td className="px-4 py-3 text-right text-gray-700">₩0</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {row.plannedDays.toFixed(2)}일
                </td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {row.participationRate}%
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ₩{Math.round(row.dailyCost).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ₩{Math.round(row.dailyOpex).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ₩{Math.round(row.dailyTotalCost).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {row.actualDays.toFixed(2)}일
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ₩{Math.round(row.totalInvestment).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  ₩{Math.round(row.performance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
