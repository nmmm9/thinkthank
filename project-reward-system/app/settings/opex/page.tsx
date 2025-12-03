'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import FilterBar, { FilterSelect } from '@/components/FilterBar';
import { getOpexList, createOpex, updateOpex, deleteOpex } from '@/lib/api';
import type { Opex } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/auth-store';
import { Plus, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react';

// 비용 항목 타입
type ExpenseItem = {
  id: string;
  category: string;
  amount: number;
  memo: string;
};

// 확장된 Opex 타입 (항목별 비용 포함)
type OpexWithItems = Opex & {
  items?: ExpenseItem[];
};

export default function OpexPage() {
  const { member } = useAuthStore();
  const [selectedYear, setSelectedYear] = useState('2025');
  const [opexes, setOpexes] = useState<OpexWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getOpexList();
      // items 필드 파싱
      const parsedData = data.map((opex: any) => {
        let items: ExpenseItem[] = [];

        // items 필드가 있는 경우
        if (opex.items && Array.isArray(opex.items) && opex.items.length > 0) {
          items = opex.items;
        }
        // 기존 형식 데이터 (items 없이 amount만 있는 경우)
        else if (opex.amount && opex.amount > 0) {
          items = [{
            id: 'legacy-1',
            category: '운영비',
            amount: opex.amount,
            memo: opex.memo || '',
          }];
        }

        return {
          ...opex,
          items,
        };
      });
      setOpexes(parsedData);
    } catch (error) {
      console.error('Failed to load opex data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 연도별 필터링
  const filteredOpexes = opexes.filter((opex) => {
    if (selectedYear === '전체') return true;
    return opex.year_month.startsWith(selectedYear);
  });

  // 월별 토글
  const toggleMonth = (yearMonth: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [yearMonth]: !prev[yearMonth],
    }));
  };

  // 연도 옵션 생성
  const years = Array.from(new Set(opexes.map((o) => o.year_month.substring(0, 4)))).sort().reverse();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="운영비" description="회사의 매월 운영비를 관리합니다." />

      {/* 상단 버튼 및 필터 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          운영비 추가
        </button>

        <FilterSelect
          label=""
          value={selectedYear}
          onChange={setSelectedYear}
          options={[
            { value: '전체', label: '연도 - 전체' },
            ...years.map((y) => ({ value: y, label: y })),
          ]}
        />
      </div>

      {/* 운영비 목록 (가계부 형식) */}
      <div className="space-y-4">
        {filteredOpexes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            등록된 운영비가 없습니다. 운영비를 추가해주세요.
          </div>
        ) : (
          filteredOpexes.map((opex) => (
            <OpexCard
              key={opex.id}
              opex={opex}
              isExpanded={expandedMonths[opex.year_month] || false}
              onToggle={() => toggleMonth(opex.year_month)}
              onUpdate={loadData}
              orgId={member?.organization?.id || ''}
            />
          ))
        )}
      </div>

      {/* 운영비 추가 모달 */}
      {showAddModal && (
        <OpexAddModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={loadData}
          existingMonths={opexes.map((o) => o.year_month)}
          orgId={member?.organization?.id || ''}
        />
      )}
    </div>
  );
}

// 운영비 카드 컴포넌트
function OpexCard({
  opex,
  isExpanded,
  onToggle,
  onUpdate,
  orgId,
}: {
  opex: OpexWithItems;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
  orgId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>(opex.items || []);
  const [isSaving, setIsSaving] = useState(false);

  // opex prop이 변경되면 items 상태를 업데이트
  useEffect(() => {
    setItems(opex.items || []);
    setIsEditing(false);
  }, [opex]);

  // 총합 계산
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  // 항목 추가
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        category: '',
        amount: 0,
        memo: '',
      },
    ]);
    setIsEditing(true);
  };

  // 항목 삭제
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // 항목 수정
  const updateItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('Saving opex:', { id: opex.id, totalAmount, items });
      await updateOpex(opex.id, {
        amount: totalAmount,
        items: items as any,
      });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('저장 실패:', error?.message || error);
      alert(`저장에 실패했습니다: ${error?.message || '알 수 없는 오류'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteOpex(opex.id);
      onUpdate();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 연월 포맷
  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    return `${year}년 ${parseInt(month)}월`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {formatYearMonth(opex.year_month)}
            </h3>
            <p className="text-sm text-gray-500">
              {items.length}개 항목
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {totalAmount.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* 상세 내용 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* 항목 목록 */}
          <div className="space-y-2 mb-4">
            {/* 헤더 */}
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 px-2">
              <div className="col-span-4">항목</div>
              <div className="col-span-3 text-right">금액</div>
              <div className="col-span-4">메모</div>
              <div className="col-span-1"></div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                항목이 없습니다. 항목을 추가해주세요.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => {
                        updateItem(item.id, 'category', e.target.value);
                        setIsEditing(true);
                      }}
                      placeholder="항목명 (예: 사무실 임대료)"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={item.amount ? item.amount.toLocaleString() : ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value.replace(/,/g, '')) || 0;
                        updateItem(item.id, 'amount', value);
                        setIsEditing(true);
                      }}
                      placeholder="금액"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.memo}
                      onChange={(e) => {
                        updateItem(item.id, 'memo', e.target.value);
                        setIsEditing(true);
                      }}
                      placeholder="메모"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => {
                        removeItem(item.id);
                        setIsEditing(true);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 합계 */}
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg mb-4">
            <span className="font-medium text-gray-700">총 운영비</span>
            <span className="text-xl font-bold text-blue-600">
              {totalAmount.toLocaleString()}원
            </span>
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-between">
            <button
              onClick={addItem}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              항목 추가
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 운영비 추가 모달
function OpexAddModal({
  isOpen,
  onClose,
  onSave,
  existingMonths,
  orgId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingMonths: string[];
  orgId: string;
}) {
  const [yearMonth, setYearMonth] = useState('');
  const [items, setItems] = useState<ExpenseItem[]>([
    { id: '1', category: '', amount: 0, memo: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // 총합 계산
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  // 항목 추가
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        category: '',
        amount: 0,
        memo: '',
      },
    ]);
  };

  // 항목 삭제
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  // 항목 수정
  const updateItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // 저장
  const handleSave = async () => {
    if (!yearMonth) {
      alert('연월을 선택해주세요.');
      return;
    }

    if (existingMonths.includes(yearMonth)) {
      alert('이미 해당 월의 운영비가 등록되어 있습니다.');
      return;
    }

    setIsSaving(true);
    try {
      await createOpex({
        org_id: orgId,
        year_month: yearMonth,
        amount: totalAmount,
        items: items as any,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 연월 옵션 생성 (현재 월부터 12개월)
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      options.push({ value, label });
    }
    return options;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">운영비 추가</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 연월 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연월 *
            </label>
            <select
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">연월 선택</option>
              {getMonthOptions().map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={existingMonths.includes(opt.value)}
                >
                  {opt.label} {existingMonths.includes(opt.value) ? '(등록됨)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 항목 목록 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                비용 항목
              </label>
              <button
                onClick={addItem}
                className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                항목 추가
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      placeholder="항목명"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={item.amount ? item.amount.toLocaleString() : ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value.replace(/,/g, '')) || 0;
                        updateItem(item.id, 'amount', value);
                      }}
                      placeholder="금액"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.memo}
                      onChange={(e) => updateItem(item.id, 'memo', e.target.value)}
                      placeholder="메모"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 합계 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">총 운영비</span>
              <span className="text-2xl font-bold text-blue-600">
                {totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !yearMonth}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
