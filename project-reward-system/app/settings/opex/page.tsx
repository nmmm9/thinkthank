'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect } from '@/components/FilterBar';
import { SaveButton, DeleteButton } from '@/components/ActionButtons';
import { opexes } from '@/mocks/data';
import { Search } from 'lucide-react';

export default function OpexPage() {
  const [selectedYear, setSelectedYear] = useState('연도 - 전체');

  return (
    <div>
      <PageHeader title="운영비" description="회사의 매월 운영비를 입력합니다." />

      <FilterBar onSearch={() => console.log('Search')}>
        <FilterSelect
          label=""
          value={selectedYear}
          onChange={setSelectedYear}
          options={[
            { value: '연도 - 전체', label: '연도 - 전체' },
            { value: '2025', label: '2025' },
            { value: '2024', label: '2024' },
          ]}
        />
      </FilterBar>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-40">연월</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-48">운영비</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">비고</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">저장</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {opexes.map((opex) => (
              <tr key={opex.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center text-gray-700">{opex.yearMonth}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">₩</span>
                    <input
                      type="number"
                      defaultValue={opex.amount}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    defaultValue={opex.memo}
                    placeholder="비고를 입력하세요"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
  );
}
