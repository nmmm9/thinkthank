'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { ToggleSwitch, SaveButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import { getProjectCategories } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ProjectCategory } from '@/lib/supabase/database.types';
import { Upload } from 'lucide-react';

export default function MiscPage() {
  const { member } = useAuthStore();
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesData = await getProjectCategories();
        setProjectCategories(categoriesData);
        // 회사 정보는 member.organization에서 가져옴
        if (member?.organization) {
          setCompanyName(member.organization.name);
          setLogoUrl((member.organization as any).logo_url || '');
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [member]);

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
        title="기타설정"
        description="프로젝트 구분, 회사정보 등을 설정할 수 있습니다."
      />

      <div className="space-y-6">
        {/* 프로젝트 구분 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">프로젝트 구분</h2>
            <AddButton onClick={() => console.log('Add category')} label="추가" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">프로젝트 구분</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-32">
                    활성여부
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">저장</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projectCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={category.name}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch
                        checked={category.is_active}
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

        {/* 회사 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">회사 정보</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회사 이름*
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="(주)리워딩"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회사 로고*
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="PALXwYSIGHTwmcQBAPF5mmoOvQAZMIAbXHQREMQs.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              {logoUrl ? (
                <div className="text-center">
                  <div className="w-32 h-32 bg-white rounded-lg border border-gray-200 flex items-center justify-center mx-auto mb-2">
                    <span className="text-gray-400 text-xs">로고 미리보기</span>
                  </div>
                  <p className="text-xs text-gray-500">{logoUrl.substring(0, 20)}...</p>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Upload className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">로고를 업로드하세요</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => console.log('Save company info')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
