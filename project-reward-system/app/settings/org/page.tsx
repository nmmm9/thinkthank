'use client';

import PageHeader from '@/components/PageHeader';
import { ToggleSwitch, SaveButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import { teams, positions } from '@/mocks/data';

export default function OrgPage() {
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
                      checked={team.isActive}
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
                      checked={position.isActive}
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
