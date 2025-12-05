import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  scheduleToGoogleEvent,
  googleEventToScheduleData,
} from '@/lib/google-calendar/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { memberId, accessToken, calendarId, action, scheduleData, syncOptions } = await request.json();

    if (!memberId || !accessToken || !calendarId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 특정 스케줄 동기화 (생성/수정/삭제)
    if (action && scheduleData) {
      return handleScheduleAction(accessToken, calendarId, action, scheduleData, memberId);
    }

    // 전체 동기화 (날짜 범위 지정 가능)
    return handleFullSync(accessToken, calendarId, memberId, syncOptions);
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 개별 스케줄 동기화
async function handleScheduleAction(
  accessToken: string,
  calendarId: string,
  action: 'create' | 'update' | 'delete',
  scheduleData: any,
  memberId: string
) {
  try {
    if (action === 'create') {
      // 스케줄 -> Google Calendar 이벤트 생성
      const event = scheduleToGoogleEvent(
        scheduleData,
        scheduleData.projectName || '기타',
        scheduleData.projectId
      );
      const createdEvent = await createCalendarEvent(accessToken, calendarId, event);

      // google_event_id 저장
      await supabase
        .from('schedules')
        .update({ google_event_id: createdEvent.id })
        .eq('id', scheduleData.id);

      return NextResponse.json({ success: true, eventId: createdEvent.id });
    }

    if (action === 'update') {
      if (!scheduleData.google_event_id) {
        // google_event_id 없으면 새로 생성
        const event = scheduleToGoogleEvent(
          scheduleData,
          scheduleData.projectName || '기타',
          scheduleData.projectId
        );
        const createdEvent = await createCalendarEvent(accessToken, calendarId, event);

        await supabase
          .from('schedules')
          .update({ google_event_id: createdEvent.id })
          .eq('id', scheduleData.id);

        return NextResponse.json({ success: true, eventId: createdEvent.id });
      }

      // 기존 이벤트 수정
      const event = scheduleToGoogleEvent(
        scheduleData,
        scheduleData.projectName || '기타',
        scheduleData.projectId
      );
      await updateCalendarEvent(accessToken, calendarId, scheduleData.google_event_id, event);

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      if (scheduleData.google_event_id) {
        await deleteCalendarEvent(accessToken, calendarId, scheduleData.google_event_id);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Schedule action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 동기화 옵션 타입
interface SyncOptions {
  startDate?: string; // YYYY-MM-DD 형식
  endDate?: string;   // YYYY-MM-DD 형식
  maxResults?: number;
  isHistorySync?: boolean; // 히스토리 동기화 모드 (삭제 처리 안함)
}

// 전체 동기화
async function handleFullSync(
  accessToken: string,
  calendarId: string,
  memberId: string,
  syncOptions?: SyncOptions
) {
  try {
    // 1. 동기화 설정 가져오기
    const { data: syncSettings } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('member_id', memberId)
      .single();

    // 2. 멤버의 조직 정보 가져오기
    const { data: member } = await supabase
      .from('members')
      .select('org_id')
      .eq('id', memberId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // 3. 프로젝트 목록 가져오기 (이름 매칭용)
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('org_id', member.org_id);

    const projectMap = new Map(projects?.map((p) => [p.name, p.id]) || []);

    // 4. 동기화 날짜 범위 설정
    const now = new Date();
    let timeMin: Date;
    let timeMax: Date;

    if (syncOptions?.startDate && syncOptions?.endDate) {
      // 사용자 지정 범위 (히스토리 동기화용)
      timeMin = new Date(syncOptions.startDate);
      timeMax = new Date(syncOptions.endDate);
    } else {
      // 기본 범위: 6개월 전 ~ 3개월 후
      timeMin = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    // 페이지네이션으로 이벤트 가져오기 (주별 동기화는 제한 없음)
    const calendarEvents = await getCalendarEvents(accessToken, calendarId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: syncOptions?.maxResults, // 없으면 무제한
    });

    // 5. 기존 스케줄 가져오기 (동기화 범위 내)
    const { data: existingSchedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('member_id', memberId)
      .gte('date', timeMin.toISOString().split('T')[0])
      .lte('date', timeMax.toISOString().split('T')[0]);

    const scheduleByGoogleId = new Map(
      existingSchedules?.filter((s) => s.google_event_id).map((s) => [s.google_event_id, s]) || []
    );

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // 배치 처리를 위한 배열
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];
    const toDeleteIds: string[] = [];

    // 6. Google Calendar 이벤트 -> 스케줄 동기화 (배치 준비)
    for (const event of calendarEvents.items || []) {
      if (!event.id) continue;

      const existingSchedule = scheduleByGoogleId.get(event.id);

      // 삭제된 이벤트 처리 (Google Calendar에서 삭제됨)
      if (event.status === 'cancelled') {
        if (existingSchedule) {
          toDeleteIds.push(existingSchedule.id);
        }
        continue;
      }

      const scheduleData = googleEventToScheduleData(event);

      // 프로젝트 ID 찾기
      let projectId: string | null = scheduleData.projectId;
      if (!projectId && scheduleData.projectName) {
        projectId = projectMap.get(scheduleData.projectName) || null;
      }

      // 시간 계산 (종일 이벤트는 minutes = 0)
      let minutes = 0;
      if (!scheduleData.is_all_day && scheduleData.start_time && scheduleData.end_time) {
        const startParts = scheduleData.start_time.split(':').map(Number);
        const endParts = scheduleData.end_time.split(':').map(Number);
        minutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
      }

      if (existingSchedule) {
        // 기존 스케줄 업데이트 준비
        const googleUpdated = new Date(event.updated || event.start.dateTime || (event.start as any).date);
        const scheduleUpdated = new Date(existingSchedule.updated_at);

        if (googleUpdated > scheduleUpdated) {
          toUpdate.push({
            id: existingSchedule.id,
            data: {
              date: scheduleData.date,
              start_time: scheduleData.start_time,
              end_time: scheduleData.end_time,
              description: scheduleData.description,
              minutes: Math.max(0, minutes),
              project_id: projectId,
              is_google_read_only: scheduleData.is_google_read_only,
              updated_at: new Date().toISOString(),
            },
          });
        }
      } else {
        // 새 스케줄 생성 준비
        toInsert.push({
          org_id: member.org_id,
          member_id: memberId,
          project_id: projectId,
          date: scheduleData.date,
          start_time: scheduleData.start_time,
          end_time: scheduleData.end_time,
          description: scheduleData.description,
          minutes: Math.max(0, minutes),
          google_event_id: event.id,
          is_google_read_only: scheduleData.is_google_read_only,
        });
      }
    }

    // 7. Google Calendar에서 삭제된 스케줄 감지 (히스토리 동기화 시에는 건너뜀)
    if (!syncOptions?.isHistorySync) {
      const activeGoogleEventIds = new Set(
        (calendarEvents.items || [])
          .filter((e) => e.id && e.status !== 'cancelled')
          .map((e) => e.id)
      );

      // google_event_id가 있지만 Google Calendar에 없는 스케줄
      const orphanedSchedules = existingSchedules?.filter(
        (s) => s.google_event_id && !activeGoogleEventIds.has(s.google_event_id)
      ) || [];

      orphanedSchedules.forEach((s) => toDeleteIds.push(s.id));
    }

    // 8. 배치 INSERT (100개씩)
    const BATCH_SIZE = 100;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('schedules').insert(batch);
      if (!error) created += batch.length;
    }

    // 9. 배치 UPDATE (Promise.all로 병렬 처리, 10개씩)
    const UPDATE_BATCH_SIZE = 10;
    for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + UPDATE_BATCH_SIZE);
      await Promise.all(
        batch.map(({ id, data }) =>
          supabase.from('schedules').update(data).eq('id', id)
        )
      );
      updated += batch.length;
    }

    // 10. 배치 DELETE
    if (toDeleteIds.length > 0) {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .in('id', toDeleteIds);
      if (!error) deleted = toDeleteIds.length;
    }

    // 8. 스케줄 -> Google Calendar 동기화는 개별 저장 시(saveSchedules)에만 처리
    // 전체 동기화에서는 Google Calendar → 스케줄 방향만 처리 (중복 생성 방지)

    // 9. 동기화 설정 업데이트
    await supabase
      .from('calendar_sync_settings')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId);

    return NextResponse.json({
      success: true,
      stats: {
        fetched: calendarEvents.items?.length || 0,
        created,
        updated,
        deleted,
        syncRange: {
          from: timeMin.toISOString().split('T')[0],
          to: timeMax.toISOString().split('T')[0],
        },
        isHistorySync: syncOptions?.isHistorySync || false,
      },
    });
  } catch (error: any) {
    console.error('Full sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
