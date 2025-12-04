'use client';

import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { ToggleSwitch, SaveButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import {
  getProjectCategories,
  createProjectCategory,
  updateProjectCategory,
  deleteProjectCategory,
  updateOrganization,
  uploadLogo,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ProjectCategory } from '@/lib/supabase/database.types';
import { Upload, X, Check, AlertTriangle } from 'lucide-react';

interface EditableCategory extends ProjectCategory {
  editName: string;
  isModified: boolean;
}

export default function MiscPage() {
  const { member, setMember } = useAuthStore();
  const [projectCategories, setProjectCategories] = useState<EditableCategory[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // 삭제 확인 모달
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // 알림 모달
  const [alertModal, setAlertModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesData = await getProjectCategories();
        setProjectCategories(
          categoriesData.map((cat) => ({
            ...cat,
            editName: cat.name,
            isModified: false,
          }))
        );
        // 회사 정보는 member.organization에서 가져옴
        if (member?.organization) {
          setCompanyName(member.organization.name);
          setLogoUrl((member.organization as any).logo_url || '');
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setAlertModal({ type: 'error', message: '데이터를 불러오는데 실패했습니다.' });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [member]);

  // 카테고리 이름 변경
  const handleCategoryNameChange = (id: string, newName: string) => {
    setProjectCategories((prev) =>
      prev.map((cat) =>
        cat.id === id
          ? { ...cat, editName: newName, isModified: newName !== cat.name }
          : cat
      )
    );
  };

  // 카테고리 활성 상태 토글
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      setSavingCategoryId(id);
      await updateProjectCategory(id, { is_active: isActive });
      setProjectCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, is_active: isActive } : cat))
      );
    } catch (error) {
      console.error('Failed to toggle category:', error);
      setAlertModal({ type: 'error', message: '상태 변경에 실패했습니다.' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  // 카테고리 저장
  const handleSaveCategory = async (id: string) => {
    const category = projectCategories.find((cat) => cat.id === id);
    if (!category || !category.editName.trim()) {
      setAlertModal({ type: 'error', message: '카테고리 이름을 입력해주세요.' });
      return;
    }

    try {
      setSavingCategoryId(id);
      await updateProjectCategory(id, { name: category.editName.trim() });
      setProjectCategories((prev) =>
        prev.map((cat) =>
          cat.id === id
            ? { ...cat, name: category.editName.trim(), isModified: false }
            : cat
        )
      );
      setAlertModal({ type: 'success', message: '저장되었습니다.' });
    } catch (error) {
      console.error('Failed to save category:', error);
      setAlertModal({ type: 'error', message: '저장에 실패했습니다.' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (id: string) => {
    try {
      setDeletingCategoryId(id);
      await deleteProjectCategory(id);
      setProjectCategories((prev) => prev.filter((cat) => cat.id !== id));
      setDeleteConfirm(null);
      setAlertModal({ type: 'success', message: '삭제되었습니다.' });
    } catch (error) {
      console.error('Failed to delete category:', error);
      setAlertModal({ type: 'error', message: '삭제에 실패했습니다. 해당 카테고리를 사용하는 프로젝트가 있을 수 있습니다.' });
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // 카테고리 추가
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setAlertModal({ type: 'error', message: '카테고리 이름을 입력해주세요.' });
      return;
    }

    if (!member?.org_id) {
      setAlertModal({ type: 'error', message: '조직 정보를 찾을 수 없습니다.' });
      return;
    }

    try {
      setIsAddingCategory(true);
      const newCategory = {
        org_id: member.org_id,
        name: newCategoryName.trim(),
        sort_order: projectCategories.length,
      };
      await createProjectCategory(newCategory);

      // 새로고침하여 최신 데이터 가져오기
      const categoriesData = await getProjectCategories();
      setProjectCategories(
        categoriesData.map((cat) => ({
          ...cat,
          editName: cat.name,
          isModified: false,
        }))
      );

      setNewCategoryName('');
      setAlertModal({ type: 'success', message: '카테고리가 추가되었습니다.' });
    } catch (error) {
      console.error('Failed to add category:', error);
      setAlertModal({ type: 'error', message: '카테고리 추가에 실패했습니다.' });
    } finally {
      setIsAddingCategory(false);
    }
  };

  // 회사 정보 저장
  const handleSaveCompanyInfo = async () => {
    if (!companyName.trim()) {
      setAlertModal({ type: 'error', message: '회사 이름을 입력해주세요.' });
      return;
    }

    if (!member?.org_id) {
      setAlertModal({ type: 'error', message: '조직 정보를 찾을 수 없습니다.' });
      return;
    }

    try {
      setIsSavingCompany(true);
      const updatedOrg = await updateOrganization(member.org_id, {
        name: companyName.trim(),
        logo_url: logoUrl || null,
      });

      // auth store 업데이트
      if (member) {
        setMember({
          ...member,
          organization: {
            ...member.organization!,
            name: updatedOrg.name,
            logo_url: updatedOrg.logo_url,
          } as any,
        });
      }

      setAlertModal({ type: 'success', message: '회사 정보가 저장되었습니다.' });
    } catch (error) {
      console.error('Failed to save company info:', error);
      setAlertModal({ type: 'error', message: '회사 정보 저장에 실패했습니다.' });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // 로고 업로드
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlertModal({ type: 'error', message: '파일 크기는 5MB 이하여야 합니다.' });
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      setAlertModal({ type: 'error', message: '이미지 파일만 업로드 가능합니다.' });
      return;
    }

    if (!member?.org_id) {
      setAlertModal({ type: 'error', message: '조직 정보를 찾을 수 없습니다.' });
      return;
    }

    try {
      setIsUploading(true);
      const publicUrl = await uploadLogo(member.org_id, file);
      setLogoUrl(publicUrl);
      setAlertModal({ type: 'success', message: '로고가 업로드되었습니다. 저장 버튼을 눌러 적용하세요.' });
    } catch (error) {
      console.error('Failed to upload logo:', error);
      setAlertModal({ type: 'error', message: '로고 업로드에 실패했습니다.' });
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      <PageHeader
        title="기타설정"
        description="프로젝트 구분, 회사정보 등을 설정할 수 있습니다."
      />

      <div className="space-y-6">
        {/* 프로젝트 구분 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">프로젝트 구분</h2>
          </div>

          {/* 새 카테고리 추가 */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="새 카테고리 이름"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
              }}
            />
            <button
              onClick={handleAddCategory}
              disabled={isAddingCategory}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAddingCategory ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '추가'
              )}
            </button>
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
                        value={category.editName}
                        onChange={(e) => handleCategoryNameChange(category.id, e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                          category.isModified
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-gray-300'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch
                        checked={category.is_active}
                        onChange={(checked) => handleToggleActive(category.id, checked)}
                        disabled={savingCategoryId === category.id}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSaveCategory(category.id)}
                        disabled={savingCategoryId === category.id || !category.isModified}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          category.isModified
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        } disabled:opacity-50`}
                      >
                        {savingCategoryId === category.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          '저장'
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDeleteConfirm({ id: category.id, name: category.name })}
                        disabled={deletingCategoryId === category.id}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {deletingCategoryId === category.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          '삭제'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {projectCategories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      등록된 프로젝트 구분이 없습니다.
                    </td>
                  </tr>
                )}
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
                  회사 로고
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="로고 URL 또는 업로드"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  이미지 파일만 가능 (최대 5MB)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              {logoUrl ? (
                <div className="text-center">
                  <div className="w-32 h-32 bg-white rounded-lg border border-gray-200 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                    <img
                      src={logoUrl}
                      alt="회사 로고"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <span className="text-gray-400 text-xs hidden">로고 로딩 실패</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">
                    {logoUrl.length > 40 ? logoUrl.substring(0, 40) + '...' : logoUrl}
                  </p>
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
              onClick={handleSaveCompanyInfo}
              disabled={isSavingCompany}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingCompany ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">삭제 확인</h3>
            </div>
            <p className="text-gray-600 mb-6">
              <span className="font-medium">"{deleteConfirm.name}"</span> 카테고리를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-red-500">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteCategory(deleteConfirm.id)}
                disabled={deletingCategoryId === deleteConfirm.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingCategoryId === deleteConfirm.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 알림 모달 */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAlertModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                {alertModal.type === 'success' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {alertModal.type === 'success' ? '성공' : '오류'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal(null)}
              className={`w-full px-4 py-2 rounded-lg text-white transition-colors ${
                alertModal.type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
