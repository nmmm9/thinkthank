'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect, FilterInput } from '@/components/FilterBar';
import { ToggleSwitch, SaveButton, DeleteButton } from '@/components/ActionButtons';
import { getMembers, getTeams, updateMember, deleteMember } from '@/lib/api';
import type { Member, Team } from '@/lib/supabase/database.types';
import { Eye } from 'lucide-react';

// 확장된 멤버 타입
interface MemberWithRelations extends Member {
  team?: Team | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editedMembers, setEditedMembers] = useState<Record<string, Partial<Member>>>({});

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [membersData, teamsData] = await Promise.all([
          getMembers(),
          getTeams(),
        ]);
        setMembers(membersData as MemberWithRelations[]);
        setTeams(teamsData);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 필터링된 멤버
  const filteredMembers = members.filter((member) => {
    const matchesTeam = selectedTeam === 'all' || member.team_id === selectedTeam;
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  // 필드 변경 핸들러
  const handleFieldChange = (memberId: string, field: string, value: unknown) => {
    setEditedMembers((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value,
      },
    }));
  };

  // 저장 핸들러
  const handleSave = async (memberId: string) => {
    const updates = editedMembers[memberId];
    if (!updates) return;

    try {
      await updateMember(memberId, updates);
      // 상태 업데이트
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
      );
      // 편집 상태 초기화
      setEditedMembers((prev) => {
        const newState = { ...prev };
        delete newState[memberId];
        return newState;
      });
      alert('저장되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 삭제 핸들러
  const handleDelete = async (memberId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 현재 값 가져오기 (편집된 값 우선)
  const getValue = (member: MemberWithRelations, field: keyof Member) => {
    if (editedMembers[member.id]?.[field] !== undefined) {
      return editedMembers[member.id][field];
    }
    return member[field];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

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
            { value: 'all', label: '팀 - 전체' },
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
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">팀</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-40">연봉</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">이메일</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                비밀번호 수정
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">레벨</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">승인</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                활성
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">저장</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center text-gray-700">{member.name}</td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={getValue(member, 'team_id') as string || ''}
                    onChange={(e) => handleFieldChange(member.id, 'team_id', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">선택</option>
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
                    value={getValue(member, 'annual_salary') as number}
                    onChange={(e) => handleFieldChange(member.id, 'annual_salary', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-3 text-gray-700">{member.email}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    className="p-1 text-gray-600 hover:text-primary transition-colors"
                    title="비밀번호 수정"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={getValue(member, 'role') as string}
                    onChange={(e) => handleFieldChange(member.id, 'role', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="admin">총괄관리자</option>
                    <option value="manager">팀관리자</option>
                    <option value="user">일반</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <ToggleSwitch
                    checked={getValue(member, 'is_approved') as boolean}
                    onChange={(checked) => handleFieldChange(member.id, 'is_approved', checked)}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <ToggleSwitch
                    checked={getValue(member, 'is_active') as boolean}
                    onChange={(checked) => handleFieldChange(member.id, 'is_active', checked)}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <SaveButton onClick={() => handleSave(member.id)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <DeleteButton onClick={() => handleDelete(member.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            팀원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
