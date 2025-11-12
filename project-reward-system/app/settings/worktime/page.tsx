'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { AddButton, SaveButton } from '@/components/ActionButtons';
import { holidays, workTimeSetting } from '@/mocks/data';

export default function WorkTimePage() {
  const [workMinutes, setWorkMinutes] = useState(workTimeSetting.workMinutesPerDay);

  return (
    <div>
      <PageHeader
        title="휴일 및 근로시간"
        description="회사의 휴일과 근로시간을 등록 관리 합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 휴일 목록 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">휴일</h2>
            <AddButton onClick={() => console.log('Add holiday')} label="휴일 추가" />
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                    휴일 날짜
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">휴일명칭</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                    구분
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-gray-700">{holiday.date}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{holiday.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          holiday.type === 'auto'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {holiday.type === 'auto' ? '자동 추가' : '수동 추가'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {holiday.type === 'manual' && (
                        <button
                          onClick={() => console.log('Delete')}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 근로시간 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">근로시간</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1일 근로시간(분)*
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={workMinutes}
                  onChange={(e) => setWorkMinutes(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">분</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {workMinutes}분 = {(workMinutes / 60).toFixed(1)}시간
              </p>
            </div>

            <button
              onClick={() => console.log('Save work time')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <SaveButton onClick={() => {}} />
              <span>저장</span>
            </button>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">안내</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 기본 근로시간은 8시간(480분)입니다.</li>
                <li>• 스케줄 계산 시 이 시간을 기준으로 참여일수가 계산됩니다.</li>
                <li>• 휴일은 스케줄 계산에서 자동으로 제외됩니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
