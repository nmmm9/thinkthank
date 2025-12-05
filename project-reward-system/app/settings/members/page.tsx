'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect, FilterInput } from '@/components/FilterBar';
import { ToggleSwitch, DeleteButton } from '@/components/ActionButtons';
import Modal from '@/components/Modal';
import { getMembers, getTeams, updateMember, deleteMember } from '@/lib/api';
import type { Member, Team } from '@/lib/supabase/database.types';
import { Eye, Save, UserPlus, Mail } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

// 확장된 멤버 타입
interface MemberWithRelations extends Member {
  team?: Team | null;
}

// 레벨 표시 함수
const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: '총괄관리자',
    manager: '팀관리자',
    user: '일반',
  };
  return labels[role] || role;
};

export default function MembersPage() {
  const { member: currentUser } = useAuthStore();
  const isFullAdmin = currentUser?.role === 'admin'; // 총괄관리자
  const isManager = currentUser?.role === 'manager'; // 팀관리자
  const isAdminOrManager = isFullAdmin || isManager; // 관리자급 (수정 가능)

  // 연봉 블러 처리 여부 확인 (팀관리자가 팀관리자 이상의 연봉을 볼 때, 본인 제외)
  const shouldBlurSalary = (member: MemberWithRelations) => {
    if (isFullAdmin) return false; // 총괄관리자는 모두 볼 수 있음
    if (!isManager) return true; // 일반사원은 모두 블러 (이 페이지 접근 불가하지만 방어용)
    // 팀관리자인 경우: 본인은 볼 수 있고, 다른 팀관리자/총괄관리자는 블러
    if (member.id === currentUser?.id) return false;
    return member.role === 'admin' || member.role === 'manager';
  };

  // 팀/직급 수정 가능 여부 확인 (팀관리자는 다른 팀관리자/총괄관리자 수정 불가)
  const canEditMemberRole = (member: MemberWithRelations) => {
    if (isFullAdmin) return true; // 총괄관리자는 모두 수정 가능
    if (!isManager) return false; // 일반사원은 수정 불가
    // 팀관리자인 경우: 일반 사원만 수정 가능 (다른 팀관리자/총괄관리자는 수정 불가)
    return member.role === 'user';
  };

  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedMembers, setEditedMembers] = useState<Record<string, Partial<Member>>>({});

  // 초대 관련 상태
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 변경사항 있는지 확인
  const hasChanges = Object.keys(editedMembers).length > 0;

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

  // 페이지 이탈 경고 (브라우저 새로고침/닫기) - 관리자급
  useEffect(() => {
    if (!isAdminOrManager) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, isAdminOrManager]);

  // 레벨 우선순위 (낮을수록 먼저)
  const getRolePriority = (role: string) => {
    const priorities: Record<string, number> = {
      admin: 1,
      manager: 2,
      user: 3,
    };
    return priorities[role] || 99;
  };

  // 필터링 및 정렬된 멤버 (팀별 → 레벨별)
  const filteredMembers = members
    .filter((member) => {
      const matchesTeam = selectedTeam === 'all' || member.team_id === selectedTeam;
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            member.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTeam && matchesSearch;
    })
    .sort((a, b) => {
      // 1. 팀별 정렬 (팀 이름 기준)
      const teamA = teams.find(t => t.id === a.team_id);
      const teamB = teams.find(t => t.id === b.team_id);
      const teamNameA = teamA?.name || 'zzz';
      const teamNameB = teamB?.name || 'zzz';
      if (teamNameA !== teamNameB) {
        return teamNameA.localeCompare(teamNameB, 'ko');
      }
      // 2. 레벨별 정렬 (총괄관리자 → 팀관리자 → 일반)
      return getRolePriority(a.role) - getRolePriority(b.role);
    });

  // 필드 변경 핸들러
  const handleFieldChange = (memberId: string, field: string, value: unknown) => {
    if (!isAdminOrManager) return;
    setEditedMembers((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value,
      },
    }));
  };

  // 전체 저장 핸들러
  const handleSaveAll = async () => {
    if (!hasChanges || !isAdminOrManager) return;

    setIsSaving(true);
    try {
      const results = await Promise.allSettled(
        Object.entries(editedMembers).map(([memberId, updates]) =>
          updateMember(memberId, updates)
        )
      );

      // 실패한 항목 확인
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('저장 실패 항목:', failures);
        const errorMessages = failures.map((f) => {
          const reason = (f as PromiseRejectedResult).reason;
          return reason?.message || reason?.toString() || '알 수 없는 오류';
        });
        alert(`일부 저장에 실패했습니다:\n${errorMessages.join('\n')}`);
        return;
      }

      // 상태 업데이트
      setMembers((prev) =>
        prev.map((m) => {
          if (editedMembers[m.id]) {
            return { ...m, ...editedMembers[m.id] };
          }
          return m;
        })
      );

      // 편집 상태 초기화
      setEditedMembers({});
      alert('저장되었습니다.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('저장 실패:', errorMessage, error);
      alert(`저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (memberId: string) => {
    if (!isAdminOrManager) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      // 편집 상태에서도 제거
      setEditedMembers((prev) => {
        const newState = { ...prev };
        delete newState[memberId];
        return newState;
      });
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

  // 행이 수정되었는지 확인
  const isRowEdited = (memberId: string) => {
    return !!editedMembers[memberId];
  };

  // 팀 이름 가져오기
  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '-';
    const team = teams.find(t => t.id === teamId);
    return team?.name || '-';
  };

  // 초대 핸들러
  const handleInvite = async () => {
    if (!inviteEmail || !currentUser?.organization?.id) return;

    setIsInviting(true);
    setInviteMessage(null);

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          orgId: currentUser.organization.id,
          invitedBy: currentUser.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteMessage({ type: 'error', text: data.error || '초대 발송에 실패했습니다.' });
        return;
      }

      setInviteMessage({ type: 'success', text: data.message });
      setInviteEmail('');
      setInviteRole('user');

      // 3초 후 모달 닫기
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Invite error:', error);
      setInviteMessage({ type: 'error', text: '초대 처리 중 오류가 발생했습니다.' });
    } finally {
      setIsInviting(false);
    }
  };

  // 모달 닫기
  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteRole('user');
    setInviteMessage(null);
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
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="팀원"
          description="팀원 정보를 관리합니다."
        />
        {isAdminOrManager && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            팀원 초대
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
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
        {isAdminOrManager && hasChanges && (
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중...' : '저장'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">이름</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">팀</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-36">직급</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-40">연봉</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 max-w-[200px]">이메일</th>
              {isFullAdmin && (
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">비밀번호</th>
              )}
              {isAdminOrManager && (
                <>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">승인</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">활성</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className={`hover:bg-gray-50 ${isRowEdited(member.id) ? 'bg-yellow-50' : ''}`}
              >
                {/* 이름 */}
                <td className="px-4 py-3 text-left text-gray-700">{member.name}</td>
                {/* 팀 */}
                <td className="px-4 py-3 text-left">
                  {canEditMemberRole(member) ? (
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
                  ) : (
                    <span className="text-gray-700">{getTeamName(member.team_id)}</span>
                  )}
                </td>
                {/* 직급 */}
                <td className="px-4 py-3 text-left">
                  {canEditMemberRole(member) ? (
                    <select
                      value={getValue(member, 'role') as string}
                      onChange={(e) => handleFieldChange(member.id, 'role', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="admin">총괄관리자</option>
                      <option value="manager">팀관리자</option>
                      <option value="user">일반</option>
                    </select>
                  ) : (
                    <span className="text-gray-700">{getRoleLabel(member.role)}</span>
                  )}
                </td>
                {/* 연봉 */}
                <td className="px-4 py-3 text-center">
                  {isAdminOrManager && !shouldBlurSalary(member) ? (
                    <input
                      type="text"
                      value={(getValue(member, 'annual_salary') as number).toLocaleString()}
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value.replace(/,/g, '')) || 0;
                        handleFieldChange(member.id, 'annual_salary', numValue);
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <span className="text-gray-700">
                      {shouldBlurSalary(member) ? '********' : `${(getValue(member, 'annual_salary') as number).toLocaleString()}원`}
                    </span>
                  )}
                </td>
                {/* 이메일 */}
                <td className="px-4 py-3 text-left text-gray-700 max-w-[200px] truncate" title={member.email}>{member.email}</td>
                {/* 비밀번호 (총괄관리자만) */}
                {isFullAdmin && (
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-1 text-gray-600 hover:text-primary transition-colors"
                      title="비밀번호 수정"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                )}
                {/* 승인/활성/삭제 (관리자급) */}
                {isAdminOrManager && (
                  <>
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
                      <DeleteButton onClick={() => handleDelete(member.id)} />
                    </td>
                  </>
                )}
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

      {/* 초대 모달 */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        title="팀원 초대"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="초대할 이메일을 입력하세요"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              권한
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">일반</option>
              <option value="manager">팀관리자</option>
              {isFullAdmin && <option value="admin">총괄관리자</option>}
            </select>
          </div>

          {inviteMessage && (
            <div className={`p-3 rounded-lg ${
              inviteMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-600'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <p className="text-sm">{inviteMessage.text}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCloseInviteModal}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleInvite}
              disabled={!inviteEmail || isInviting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isInviting ? '발송 중...' : '초대 발송'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
