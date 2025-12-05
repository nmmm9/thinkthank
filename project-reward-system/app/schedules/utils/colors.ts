import { projectColors } from '../constants';
import type { ColorInfo } from '../types';
import type { Project, Member } from '@/lib/supabase/database.types';

// 팀원별 색상 (구글 캘린더 스타일)
export const memberColors = [
  { bg: 'bg-rose-400', text: 'text-white', hex: '#fb7185', light: 'bg-rose-100' },
  { bg: 'bg-amber-400', text: 'text-white', hex: '#fbbf24', light: 'bg-amber-100' },
  { bg: 'bg-lime-500', text: 'text-white', hex: '#84cc16', light: 'bg-lime-100' },
  { bg: 'bg-cyan-400', text: 'text-white', hex: '#22d3ee', light: 'bg-cyan-100' },
  { bg: 'bg-violet-400', text: 'text-white', hex: '#a78bfa', light: 'bg-violet-100' },
  { bg: 'bg-pink-400', text: 'text-white', hex: '#f472b6', light: 'bg-pink-100' },
  { bg: 'bg-emerald-400', text: 'text-white', hex: '#34d399', light: 'bg-emerald-100' },
  { bg: 'bg-sky-400', text: 'text-white', hex: '#38bdf8', light: 'bg-sky-100' },
];

// 기본 회색 색상 (프로젝트 없음)
export const defaultGrayColor: ColorInfo = {
  key: 'none',
  bg: 'bg-gray-400',
  hover: 'hover:bg-gray-500',
  text: 'text-white',
  light: 'bg-gray-100',
  hex: '#9CA3AF',
};

// 기본 파란색 (본인 색상)
export const defaultSelfColor: ColorInfo = {
  bg: 'bg-blue-500',
  text: 'text-white',
  hex: '#3b82f6',
  light: 'bg-blue-100',
};

// 프로젝트 색상 가져오기 (pure function)
export function getProjectColorByData(
  projectId: string | null,
  projects: Project[]
): ColorInfo & { isCustom?: boolean } {
  if (!projectId) {
    return { ...defaultGrayColor, isCustom: false };
  }

  const project = projects.find((p) => p.id === projectId);

  if (project?.color) {
    // hex 코드인 경우 (# 으로 시작)
    if (project.color.startsWith('#')) {
      return {
        key: 'custom',
        bg: '',
        hover: '',
        text: 'text-white',
        light: '',
        hex: project.color,
        isCustom: true,
      };
    }
    const savedColor = projectColors.find((c) => c.key === project.color);
    if (savedColor) return { ...savedColor, isCustom: false };
  }

  // 없으면 인덱스 기반 기본 색상
  const index = projects.findIndex((p) => p.id === projectId);
  return { ...projectColors[index % projectColors.length], isCustom: false };
}

// 멤버 색상 가져오기 (pure function)
export function getMemberColorByData(
  memberId: string,
  currentMemberId: string | undefined,
  myColor: string | null,
  teamMembers: Member[],
  previewMemberId: string | null,
  previewColor: string | null
): ColorInfo & { isCustom: boolean } {
  // 미리보기 색상이 있으면 우선 사용
  if (previewMemberId === memberId && previewColor) {
    return {
      bg: '',
      text: 'text-white',
      hex: previewColor,
      light: '',
      isCustom: true,
    };
  }

  // 본인인 경우
  if (memberId === currentMemberId) {
    if (myColor) {
      return {
        bg: '',
        text: 'text-white',
        hex: myColor,
        light: '',
        isCustom: true,
      };
    }
    return { ...defaultSelfColor, isCustom: false };
  }

  const memberData = teamMembers.find((m) => m.id === memberId);

  // 저장된 색상이 있으면 사용
  if (memberData?.color) {
    return {
      bg: '',
      text: 'text-white',
      hex: memberData.color,
      light: '',
      isCustom: true,
    };
  }

  // 기본 색상
  const index = teamMembers.findIndex((m) => m.id === memberId);
  if (index === -1) {
    return { bg: 'bg-gray-500', text: 'text-white', hex: '#6b7280', light: 'bg-gray-100', isCustom: false };
  }
  return { ...memberColors[index % memberColors.length], isCustom: false };
}
