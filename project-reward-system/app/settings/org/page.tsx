'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { ToggleSwitch, SaveButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from '@/lib/api';
import type { Team } from '@/lib/supabase/database.types';

interface EditableTeam extends Team {
  editedName: string;
  editedIsActive: boolean;
  isNew?: boolean;
}

export default function OrgPage() {
  const [teams, setTeams] = useState<EditableTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const teamsData = await getTeams();
        setTeams(teamsData.map(t => ({
          ...t,
          editedName: t.name,
          editedIsActive: t.is_active
        })));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 팀 추가
  const handleAddTeam = () => {
    const newTeam: EditableTeam = {
      id: `new-${Date.now()}`,
      name: '',
      is_active: true,
      sort_order: teams.length,
      created_at: new Date().toISOString(),
      editedName: '',
      editedIsActive: true,
      isNew: true
    };
    setTeams([...teams, newTeam]);
  };

  // 팀 저장
  const handleSaveTeam = async (team: EditableTeam) => {
    if (!team.editedName.trim()) {
      alert('팀명을 입력해주세요.');
      return;
    }

    setSavingTeamId(team.id);
    try {
      if (team.isNew) {
        const created = await createTeam({
          name: team.editedName.trim(),
          is_active: team.editedIsActive,
          sort_order: team.sort_order
        });
        setTeams(teams.map(t =>
          t.id === team.id
            ? { ...created, editedName: created.name, editedIsActive: created.is_active }
            : t
        ));
      } else {
        const updated = await updateTeam(team.id, {
          name: team.editedName.trim(),
          is_active: team.editedIsActive
        });
        setTeams(teams.map(t =>
          t.id === team.id
            ? { ...updated, editedName: updated.name, editedIsActive: updated.is_active }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to save team:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSavingTeamId(null);
    }
  };

  // 팀 삭제
  const handleDeleteTeam = async (team: EditableTeam) => {
    if (team.isNew) {
      setTeams(teams.filter(t => t.id !== team.id));
      return;
    }

    if (!confirm(`'${team.name}' 팀을 삭제하시겠습니까?`)) return;

    try {
      await deleteTeam(team.id);
      setTeams(teams.filter(t => t.id !== team.id));
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('삭제에 실패했습니다. 해당 팀을 사용 중인 멤버가 있는지 확인해주세요.');
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
      <PageHeader title="팀 설정" description="회사의 팀을 설정합니다." />

      <div className="max-w-2xl">
        {/* 팀 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">팀 목록</h2>
            <AddButton onClick={handleAddTeam} label="추가" />
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">팀명</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                  활성여부
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">저장</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teams.map((team) => (
                <tr key={team.id} className={`hover:bg-gray-50 ${team.isNew ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={team.editedName}
                      onChange={(e) => setTeams(teams.map(t =>
                        t.id === team.id ? { ...t, editedName: e.target.value } : t
                      ))}
                      placeholder="팀명을 입력하세요"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={team.editedIsActive}
                      onChange={(checked) => setTeams(teams.map(t =>
                        t.id === team.id ? { ...t, editedIsActive: checked } : t
                      ))}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SaveButton
                      onClick={() => handleSaveTeam(team)}
                      disabled={savingTeamId === team.id}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeleteButton onClick={() => handleDeleteTeam(team)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
