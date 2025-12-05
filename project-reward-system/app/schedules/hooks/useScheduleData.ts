'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Project, Schedule, Member, WorkTimeSetting } from '@/lib/supabase/database.types';
import { getProjects, getSchedules, getMembers, getWorkTimeSetting, getUnclassifiedSchedules } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { projectColors } from '../constants';
import { memberColors } from '../utils/colors';
import type { ColorInfo } from '../types';

export function useScheduleData() {
  const { member } = useAuthStore();

  // 데이터 상태
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [workTimeSetting, setWorkTimeSetting] = useState<WorkTimeSetting | null>(null);
  const [unclassifiedSchedules, setUnclassifiedSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 가시성 상태
  const [visibleProjects, setVisibleProjects] = useState<Record<string, boolean>>({});
  const [visibleMembers, setVisibleMembers] = useState<Record<string, boolean>>({});
  const [showMySchedule, setShowMySchedule] = useState(true);
  const [myColor, setMyColor] = useState<string | null>(null);

  // 색상 선택기 상태
  const [colorPickerMemberId, setColorPickerMemberId] = useState<string | null>(null);
  const [previewMemberColor, setPreviewMemberColor] = useState<string | null>(null);

  // 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, schedulesData, membersData, workTimeData] = await Promise.all([
          getProjects(),
          getSchedules(),
          getMembers(),
          getWorkTimeSetting(),
        ]);
        setProjects(projectsData as Project[]);
        setSchedules(schedulesData as Schedule[]);
        setWorkTimeSetting(workTimeData as WorkTimeSetting | null);
        setVisibleProjects(
          (projectsData as Project[]).reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
        );

        // 같은 조직의 멤버만 필터링 (본인 제외)
        const orgMembers = (membersData as Member[]).filter(
          (m) => m.org_id === member?.org_id && m.id !== member?.id
        );
        setTeamMembers(orgMembers);

        // 기본적으로 모든 팀원 스케줄 숨김
        setVisibleMembers(
          orgMembers.reduce((acc, m) => ({ ...acc, [m.id]: false }), {})
        );

        // 본인 색상 초기화
        const myMemberData = (membersData as Member[]).find((m) => m.id === member?.id);
        if (myMemberData?.color) {
          setMyColor(myMemberData.color);
        }

        // 미분류 스케줄 로드
        if (member?.id) {
          const unclassified = await getUnclassifiedSchedules(member.id);
          setUnclassifiedSchedules(unclassified as Schedule[]);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [member?.org_id, member?.id]);

  // 스케줄 새로고침
  const refreshSchedules = useCallback(async () => {
    const schedulesData = await getSchedules();
    setSchedules(schedulesData as Schedule[]);
    if (member?.id) {
      const unclassified = await getUnclassifiedSchedules(member.id);
      setUnclassifiedSchedules(unclassified as Schedule[]);
    }
  }, [member?.id]);

  // 프로젝트 가시성 토글
  const toggleProjectVisibility = useCallback((projectId: string) => {
    setVisibleProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  }, []);

  // 멤버 가시성 토글
  const toggleMemberVisibility = useCallback((memberId: string) => {
    setVisibleMembers((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  }, []);

  // 활성 프로젝트 필터링
  const activeProjects = useMemo(() => {
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      return end >= new Date();
    });
  }, [projects]);

  // 본인에게 할당된 활성 프로젝트만 필터링
  const myActiveProjects = useMemo(() => {
    if (!member) return [];
    return activeProjects.filter((p) => {
      const allocations = (p as any).allocations || [];
      return allocations.some((a: any) => a.member_id === member.id);
    });
  }, [activeProjects, member]);

  // 완료된 프로젝트
  const completedProjects = useMemo(() => {
    if (!member) return [];
    return projects.filter((p) => {
      const end = new Date(p.end_date);
      if (end >= new Date()) return false;
      const allocations = (p as any).allocations || [];
      return allocations.some((a: any) => a.member_id === member.id);
    });
  }, [projects, member]);

  // 프로젝트 색상 가져오기
  const getProjectColor = useCallback((projectId: string | null): ColorInfo & { isCustom?: boolean } => {
    if (!projectId) {
      return {
        key: 'none',
        bg: 'bg-gray-400',
        hover: 'hover:bg-gray-500',
        text: 'text-white',
        light: 'bg-gray-100',
        hex: '#9CA3AF',
        isCustom: false,
      };
    }

    const project = projects.find((p) => p.id === projectId);
    if (project?.color) {
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
    const index = projects.findIndex((p) => p.id === projectId);
    return { ...projectColors[index % projectColors.length], isCustom: false };
  }, [projects]);

  // 멤버 색상 가져오기
  const getMemberColor = useCallback((memberId: string): ColorInfo & { isCustom: boolean } => {
    // 미리보기 색상이 있으면 우선 사용
    if (colorPickerMemberId === memberId && previewMemberColor) {
      return {
        bg: '',
        text: 'text-white',
        hex: previewMemberColor,
        light: '',
        isCustom: true,
      };
    }

    // 본인인 경우
    if (memberId === member?.id) {
      if (myColor) {
        return {
          bg: '',
          text: 'text-white',
          hex: myColor,
          light: '',
          isCustom: true,
        };
      }
      return { bg: 'bg-blue-500', text: 'text-white', hex: '#3b82f6', light: 'bg-blue-100', isCustom: false };
    }

    const memberData = teamMembers.find((m) => m.id === memberId);
    if (memberData?.color) {
      return {
        bg: '',
        text: 'text-white',
        hex: memberData.color,
        light: '',
        isCustom: true,
      };
    }

    const index = teamMembers.findIndex((m) => m.id === memberId);
    if (index === -1) {
      return { bg: 'bg-gray-500', text: 'text-white', hex: '#6b7280', light: 'bg-gray-100', isCustom: false };
    }
    return { ...memberColors[index % memberColors.length], isCustom: false };
  }, [member?.id, myColor, teamMembers, colorPickerMemberId, previewMemberColor]);

  // 특정 날짜의 스케줄 가져오기
  const getDaySchedules = useCallback((date: Date, includeOthers: boolean = true): Schedule[] => {
    if (!member) return [];
    const dateStr = date.toISOString().split('T')[0];

    return schedules.filter((s) => {
      if (s.date !== dateStr) return false;

      // 본인 스케줄
      if (s.member_id === member.id) {
        if (!showMySchedule) return false;
        if (!s.project_id) return true;
        return visibleProjects[s.project_id];
      }

      // 다른 팀원 스케줄
      if (includeOthers && visibleMembers[s.member_id]) {
        return true;
      }

      return false;
    });
  }, [member, schedules, showMySchedule, visibleProjects, visibleMembers]);

  return {
    // 데이터
    member,
    projects,
    setProjects,
    schedules,
    setSchedules,
    teamMembers,
    setTeamMembers,
    workTimeSetting,
    unclassifiedSchedules,
    setUnclassifiedSchedules,
    isLoading,

    // 가시성
    visibleProjects,
    visibleMembers,
    showMySchedule,
    setShowMySchedule,
    myColor,
    setMyColor,
    toggleProjectVisibility,
    toggleMemberVisibility,

    // 색상 선택기
    colorPickerMemberId,
    setColorPickerMemberId,
    previewMemberColor,
    setPreviewMemberColor,

    // 필터링된 데이터
    activeProjects,
    myActiveProjects,
    completedProjects,

    // 유틸 함수
    getProjectColor,
    getMemberColor,
    getDaySchedules,
    refreshSchedules,
  };
}
