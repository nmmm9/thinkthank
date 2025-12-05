'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { ToggleSwitch, DeleteButton, AddButton } from '@/components/ActionButtons';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Team } from '@/lib/supabase/database.types';
import { Save } from 'lucide-react';

interface EditableTeam extends Team {
  editedName: string;
  editedIsActive: boolean;
  isNew?: boolean;
}

export default function OrgPage() {
  const { member } = useAuthStore();
  const isFullAdmin = member?.role === 'admin'; // 총괄관리자
  const isManager = member?.role === 'manager'; // 팀관리자
  const isAdminOrManager = isFullAdmin || isManager; // 관리자급 (수정 가능)

  const [teams, setTeams] = useState<EditableTeam[]>([]);
  const [originalTeams, setOriginalTeams] = useState<EditableTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 변경사항 확인
  const hasChanges = teams.some(team => {
    if (team.isNew) return true;
    const original = originalTeams.find(t => t.id === team.id);
    if (!original) return false;
    return team.editedName !== original.name || team.editedIsActive !== original.is_active;
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const teamsData = await getTeams() as Team[];
        const editableTeams = teamsData.map(t => ({
          ...t,
          editedName: t.name,
          editedIsActive: t.is_active
        }));
        setTeams(editableTeams);
        setOriginalTeams(editableTeams);
      } catch (error) {
        console.error('Failed to load data:', error);
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

  // 팀 추가
  const handleAddTeam = () => {
    if (!isAdminOrManager) return;
    const newTeam: EditableTeam = {
      id: `new-${Date.now()}`,
      org_id: '',
      name: '',
      is_active: true,
      sort_order: teams.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      editedName: '',
      editedIsActive: true,
      isNew: true
    };
    setTeams([...teams, newTeam]);
  };

  // 팀명 변경
  const handleNameChange = (teamId: string, value: string) => {
    if (!isAdminOrManager) return;
    setTeams(teams.map(t =>
      t.id === teamId ? { ...t, editedName: value } : t
    ));
  };

  // 활성 상태 변경
  const handleActiveChange = (teamId: string, checked: boolean) => {
    if (!isAdminOrManager) return;
    setTeams(teams.map(t =>
      t.id === teamId ? { ...t, editedIsActive: checked } : t
    ));
  };

  // 전체 저장
  const handleSaveAll = async () => {
    if (!isAdminOrManager) return;

    // 빈 이름 체크
    const emptyTeam = teams.find(t => !t.editedName.trim());
    if (emptyTeam) {
      alert('팀명을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const savePromises: Promise<unknown>[] = [];

      for (const team of teams) {
        if (team.isNew) {
          // 새 팀 생성
          savePromises.push(
            createTeam({
              org_id: member?.org_id || '',
              name: team.editedName.trim(),
              is_active: team.editedIsActive,
              sort_order: team.sort_order
            })
          );
        } else {
          // 기존 팀 수정 (변경된 경우만)
          const original = originalTeams.find(t => t.id === team.id);
          if (original && (team.editedName !== original.name || team.editedIsActive !== original.is_active)) {
            savePromises.push(
              updateTeam(team.id, {
                name: team.editedName.trim(),
                is_active: team.editedIsActive
              })
            );
          }
        }
      }

      const results = await Promise.allSettled(savePromises);

      // 실패한 항목 확인
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('저장 실패 항목:', failures);
        const errorMessages = failures.map((f) => {
          const reason = (f as PromiseRejectedResult).reason;
          return reason?.message || reason?.toString() || '알 수 없는 오류';
        });
        alert(`저장에 실패했습니다:\n${errorMessages.join('\n')}`);
        return;
      }

      // 데이터 새로고침
      const teamsData = await getTeams() as Team[];
      const editableTeams = teamsData.map(t => ({
        ...t,
        editedName: t.name,
        editedIsActive: t.is_active
      }));
      setTeams(editableTeams);
      setOriginalTeams(editableTeams);

      alert('저장되었습니다.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to save:', errorMessage, error);
      alert(`저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 팀 삭제
  const handleDeleteTeam = async (team: EditableTeam) => {
    if (!isAdminOrManager) return;

    if (team.isNew) {
      setTeams(teams.filter(t => t.id !== team.id));
      return;
    }

    if (!confirm(`'${team.name}' 팀을 삭제하시겠습니까?`)) return;

    try {
      await deleteTeam(team.id);
      setTeams(teams.filter(t => t.id !== team.id));
      setOriginalTeams(originalTeams.filter(t => t.id !== team.id));
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('삭제에 실패했습니다. 해당 팀을 사용 중인 멤버가 있는지 확인해주세요.');
    }
  };

  // 행이 수정되었는지 확인
  const isRowEdited = (team: EditableTeam) => {
    if (team.isNew) return true;
    const original = originalTeams.find(t => t.id === team.id);
    if (!original) return false;
    return team.editedName !== original.name || team.editedIsActive !== original.is_active;
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
      <PageHeader
        title="팀 설정"
        description="회사의 팀을 설정합니다."
      />

      <div className="max-w-2xl">
        {/* 팀 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">팀 목록</h2>
            {isAdminOrManager && (
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                )}
                <AddButton onClick={handleAddTeam} label="추가" />
              </div>
            )}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">팀명</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                  활성여부
                </th>
                {isAdminOrManager && (
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className={`hover:bg-gray-50 ${isRowEdited(team) ? 'bg-yellow-50' : ''} ${team.isNew ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    {isAdminOrManager ? (
                      <input
                        type="text"
                        value={team.editedName}
                        onChange={(e) => handleNameChange(team.id, e.target.value)}
                        placeholder="팀명을 입력하세요"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-gray-700">{team.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isAdminOrManager ? (
                      <ToggleSwitch
                        checked={team.editedIsActive}
                        onChange={(checked) => handleActiveChange(team.id, checked)}
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${team.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {team.is_active ? '활성' : '비활성'}
                      </span>
                    )}
                  </td>
                  {isAdminOrManager && (
                    <td className="px-4 py-3 text-center">
                      <DeleteButton onClick={() => handleDeleteTeam(team)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
