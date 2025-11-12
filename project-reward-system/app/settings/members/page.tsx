'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect, FilterInput } from '@/components/FilterBar';
import { ToggleSwitch, SaveButton, DeleteButton } from '@/components/ActionButtons';
import { members, teams, positions } from '@/mocks/data';
import { Eye } from 'lucide-react';

export default function MembersPage() {
  const [selectedTeam, setSelectedTeam] = useState('팀 - 전체');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <PageHeader
        title="팀원"
        description="팀원 레벨은 로그인한 내 정보만 수정이 가능하고, 승인여부, 삭제, 비활성이 노출되지 않습니다."
      />

      <FilterBar onSearch={() => console.log('Search')}>
        <FilterSelect
          label=""
          value={selectedTeam}
          onChange={setSelectedTeam}
          options={[
            { value: '팀 - 전체', label: '팀 - 전체' },
            ...teams.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        <FilterInput
          type="search"
          placeholder="팀원 검색"
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </FilterBar>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">팀원</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">직급</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">팀</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-40">연봉</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                로그인아이디
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                비밀번호 수정
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">레벨</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">승인</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                비활성
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">저장</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => {
              const team = teams.find((t) => t.id === member.teamId);
              const position = positions.find((p) => p.id === member.positionId);

              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center text-gray-700">{member.name}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      defaultValue={member.positionId}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      defaultValue={member.teamId}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      defaultValue={member.annualSalary}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{member.loginId}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-1 text-gray-600 hover:text-primary transition-colors"
                      title="비밀번호를 입력해 "
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      defaultValue={member.level}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="admin">총괄관리자</option>
                      <option value="manager">팀관리자</option>
                      <option value="user">일반</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={member.isApproved}
                      onChange={(checked) => console.log('Approved:', checked)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={member.isActive}
                      onChange={(checked) => console.log('Active:', checked)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SaveButton onClick={() => console.log('Save')} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeleteButton onClick={() => console.log('Delete')} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
