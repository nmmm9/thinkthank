'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { ToggleSwitch, SaveButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import { getTeams, getPositions } from '@/lib/api';
import type { Team, Position } from '@/lib/supabase/database.types';

export default function OrgPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, positionsData] = await Promise.all([
          getTeams(),
          getPositions(),
        ]);
        setTeams(teamsData);
        setPositions(positionsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="팀, 직급" description="회사의 팀과 직급을 설정합니다." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 팀 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">팀 목록</h2>
            <AddButton onClick={() => console.log('Add team')} label="추가" />
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
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={team.name}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={team.is_active}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* 직급 목록 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">직급 목록</h2>
            <AddButton onClick={() => console.log('Add position')} label="추가" />
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">직급</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                  활성여부
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">저장</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {positions.map((position) => (
                <tr key={position.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      defaultValue={position.name}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={position.is_active}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
