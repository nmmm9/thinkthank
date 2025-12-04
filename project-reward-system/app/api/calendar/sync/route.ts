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
    const { memberId, accessToken, calendarId, action, scheduleData } = await request.json();

    if (!memberId || !accessToken || !calendarId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 특정 스케줄 동기화 (생성/수정/삭제)
    if (action && scheduleData) {
      return handleScheduleAction(accessToken, calendarId, action, scheduleData, memberId);
    }

    // 전체 동기화
    return handleFullSync(accessToken, calendarId, memberId);
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

// 전체 동기화
async function handleFullSync(accessToken: string, calendarId: string, memberId: string) {
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

    // 4. Google Calendar에서 이벤트 가져오기
    // syncToken 증분 동기화 대신 항상 전체 동기화 (삭제 감지 안정성을 위해)
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const calendarEvents = await getCalendarEvents(accessToken, calendarId, {
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: threeMonthsLater.toISOString(),
      maxResults: 500,
    });

    // 5. 기존 스케줄 가져오기
    const { data: existingSchedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('member_id', memberId)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .lte('date', threeMonthsLater.toISOString().split('T')[0]);

    const scheduleByGoogleId = new Map(
      existingSchedules?.filter((s) => s.google_event_id).map((s) => [s.google_event_id, s]) || []
    );

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // 6. Google Calendar 이벤트 -> 스케줄 동기화
    for (const event of calendarEvents.items || []) {
      if (!event.id) continue;

      const existingSchedule = scheduleByGoogleId.get(event.id);

      // 삭제된 이벤트 처리 (Google Calendar에서 삭제됨)
      if (event.status === 'cancelled') {
        if (existingSchedule) {
          await supabase
            .from('schedules')
            .delete()
            .eq('id', existingSchedule.id);
          deleted++;
        }
        continue;
      }

      const scheduleData = googleEventToScheduleData(event);

      // 프로젝트 ID 찾기
      let projectId: string | null = scheduleData.projectId;
      if (!projectId && scheduleData.projectName) {
        projectId = projectMap.get(scheduleData.projectName) || null;
      }

      // 시간 계산
      const startParts = scheduleData.start_time.split(':').map(Number);
      const endParts = scheduleData.end_time.split(':').map(Number);
      const minutes = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);

      if (existingSchedule) {
        // 기존 스케줄 업데이트
        const googleUpdated = new Date(event.updated || event.start.dateTime);
        const scheduleUpdated = new Date(existingSchedule.updated_at);

        if (googleUpdated > scheduleUpdated) {
          await supabase
            .from('schedules')
            .update({
              date: scheduleData.date,
              start_time: scheduleData.start_time,
              end_time: scheduleData.end_time,
              description: scheduleData.description,
              minutes: Math.max(0, minutes),
              project_id: projectId,
              is_google_read_only: scheduleData.is_google_read_only,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSchedule.id);
          updated++;
        }
      } else {
        // 새 스케줄 생성
        await supabase.from('schedules').insert({
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
        created++;
      }
    }

    // 7. Google Calendar에서 삭제된 스케줄 감지 및 삭제
    // syncToken 증분 동기화에서 cancelled 이벤트를 못 받는 경우를 대비해
    // 항상 전체 비교로 삭제 감지
    const activeGoogleEventIds = new Set(
      (calendarEvents.items || [])
        .filter((e) => e.id && e.status !== 'cancelled')
        .map((e) => e.id)
    );

    // google_event_id가 있지만 Google Calendar에 없는 스케줄 삭제
    const schedulesToDelete = existingSchedules?.filter(
      (s) => s.google_event_id && !activeGoogleEventIds.has(s.google_event_id)
    ) || [];

    for (const schedule of schedulesToDelete) {
      await supabase
        .from('schedules')
        .delete()
        .eq('id', schedule.id);
      deleted++;
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
        created,
        updated,
        deleted,
      },
    });
  } catch (error: any) {
    console.error('Full sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
