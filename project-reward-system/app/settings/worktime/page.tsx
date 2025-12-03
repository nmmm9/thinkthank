'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { AddButton } from '@/components/ActionButtons';
import { Save } from 'lucide-react';
import { getWorkTimeSetting } from '@/lib/api';
import type { WorkTimeSetting } from '@/lib/supabase/database.types';

// JSON 파일에서 공휴일 데이터 import
import holiday2025 from '@/holiday_2025.json';
import holiday2026 from '@/holiday_2026.json';

type HolidayItem = { date: string; name: string };

// 연도별 공휴일 데이터
const holidayData: { [key: number]: HolidayItem[] } = {
  2025: holiday2025['2025'],
  2026: holiday2026['2026'],
};

const availableYears = Object.keys(holidayData).map(Number).sort();

export default function WorkTimePage() {
  const [workTimeSetting, setWorkTimeSetting] = useState<WorkTimeSetting | null>(null);
  const [workMinutes, setWorkMinutes] = useState(480);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 선택된 연도의 공휴일
  const holidays = holidayData[selectedYear] || [];

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingData = await getWorkTimeSetting() as WorkTimeSetting | null;
        setWorkTimeSetting(settingData);
        if (settingData) {
          setWorkMinutes(settingData.work_minutes_per_day);
        }
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
      <PageHeader
        title="휴일 및 근로시간"
        description="회사의 휴일과 근로시간을 등록 관리 합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 휴일 목록 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">공휴일</h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
              <AddButton onClick={() => console.log('Add holiday')} label="휴일 추가" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-40">
                    휴일 날짜
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">휴일명칭</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                      {selectedYear}년 공휴일 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  holidays.map((holiday, index) => (
                    <tr key={`${holiday.date}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center text-gray-700">{holiday.date}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{holiday.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            총 {holidays.length}개의 공휴일
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
              <Save className="w-4 h-4" />
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
