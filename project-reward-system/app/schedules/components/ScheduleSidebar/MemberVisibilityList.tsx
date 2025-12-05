'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, EyeOff } from 'lucide-react';
import { SketchPicker } from 'react-color';
import type { Member } from '@/lib/supabase/database.types';
import type { ColorInfo } from '../../types';
import { memberColors } from '../../utils/colors';

interface MemberVisibilityListProps {
  member: Member | null;
  teamMembers: Member[];
  showMySchedule: boolean;
  visibleMembers: Record<string, boolean>;
  getMemberColor: (memberId: string) => ColorInfo & { isCustom: boolean };
  setShowMySchedule: (show: boolean) => void;
  toggleMemberVisibility: (memberId: string) => void;
  onMemberColorChange: (memberId: string, color: string) => void;
}

export function MemberVisibilityList({
  member,
  teamMembers,
  showMySchedule,
  visibleMembers,
  getMemberColor,
  setShowMySchedule,
  toggleMemberVisibility,
  onMemberColorChange,
}: MemberVisibilityListProps) {
  const [colorPickerMemberId, setColorPickerMemberId] = useState<string | null>(null);
  const [previewMemberColor, setPreviewMemberColor] = useState<string | null>(null);

  // 색상 팔레트 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerMemberId && !(e.target as HTMLElement).closest('[data-member-color-picker]')) {
        setColorPickerMemberId(null);
        setPreviewMemberColor(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [colorPickerMemberId]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && colorPickerMemberId) {
        setColorPickerMemberId(null);
        setPreviewMemberColor(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [colorPickerMemberId]);

  const handleColorConfirm = (memberId: string) => {
    if (previewMemberColor) {
      onMemberColorChange(memberId, previewMemberColor);
    }
    setColorPickerMemberId(null);
    setPreviewMemberColor(null);
  };

  const renderColorPicker = (memberId: string, currentColor: string) => (
    <div className="relative" data-member-color-picker>
      <div
        className="w-4 h-4 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all"
        style={{
          backgroundColor:
            previewMemberColor && colorPickerMemberId === memberId
              ? previewMemberColor
              : currentColor,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (colorPickerMemberId === memberId) {
            setColorPickerMemberId(null);
            setPreviewMemberColor(null);
          } else {
            setColorPickerMemberId(memberId);
            setPreviewMemberColor(null);
          }
        }}
        title="색상 변경"
      />
      {colorPickerMemberId === memberId && (
        <div className="absolute left-0 top-6 z-50 bg-white rounded-lg shadow-xl">
          <SketchPicker
            color={previewMemberColor || currentColor}
            onChange={(c) => setPreviewMemberColor(c.hex)}
            presetColors={memberColors.map((mc) => mc.hex)}
          />
          <div className="flex gap-2 p-2 border-t">
            <button
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setColorPickerMemberId(null);
                setPreviewMemberColor(null);
              }}
            >
              취소
            </button>
            <button
              className="flex-1 px-3 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleColorConfirm(memberId);
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 스케줄 표시 */}
      <div className="flex items-center gap-2 mb-2 mt-4 pt-4 border-t border-gray-200">
        <Users className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">스케줄 표시</h3>
      </div>
      <div className="space-y-1">
        {/* 내 스케줄 */}
        {(() => {
          if (!member || !member.id) return null;
          const memberId = member.id as string;
          const memberColor = getMemberColor(memberId);
          return (
            <div
              className={`flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors ${
                !showMySchedule ? 'opacity-50' : ''
              }`}
            >
              {renderColorPicker(memberId, memberColor.hex)}
              <span
                className="flex-1 text-gray-900 truncate text-xs font-medium cursor-pointer"
                onClick={() => setShowMySchedule(!showMySchedule)}
              >
                {member.name} (나)
              </span>
              <div
                className="cursor-pointer"
                onClick={() => setShowMySchedule(!showMySchedule)}
              >
                {showMySchedule ? (
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                )}
              </div>
            </div>
          );
        })()}

        {/* 팀원 스케줄 */}
        {teamMembers.map((tm) => {
          const color = getMemberColor(tm.id);
          const isVisible = visibleMembers[tm.id];
          return (
            <div
              key={tm.id}
              className={`flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors ${
                !isVisible ? 'opacity-50' : ''
              }`}
            >
              {renderColorPicker(tm.id, color.hex)}
              <span
                className="flex-1 text-gray-900 truncate text-xs cursor-pointer"
                onClick={() => toggleMemberVisibility(tm.id)}
              >
                {tm.name}
              </span>
              <div
                className="cursor-pointer"
                onClick={() => toggleMemberVisibility(tm.id)}
              >
                {isVisible ? (
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
