// Google Calendar API 클라이언트

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  updated?: string;
  status?: string; // 'confirmed' | 'tentative' | 'cancelled'
  // 수정 권한 관련
  guestsCanModify?: boolean;
  organizer?: {
    email: string;
    self?: boolean; // 본인이 organizer인 경우 true
  };
  creator?: {
    email: string;
    self?: boolean; // 본인이 creator인 경우 true
  };
  extendedProperties?: {
    private?: {
      projectId?: string;
      projectName?: string;
      scheduleId?: string;
    };
  };
}

export interface GoogleCalendarList {
  items: {
    id: string;
    summary: string;
    primary?: boolean;
    accessRole?: string; // owner, writer, reader, freeBusyReader
  }[];
}

export interface GoogleCalendarEventsResponse {
  items: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

// 캘린더 목록 가져오기
export async function getCalendarList(accessToken: string): Promise<GoogleCalendarList> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch calendar list');
  }

  return response.json();
}

// 이벤트 목록 가져오기
export async function getCalendarEvents(
  accessToken: string,
  calendarId: string,
  options?: {
    syncToken?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }
): Promise<GoogleCalendarEventsResponse> {
  const params = new URLSearchParams();

  if (options?.syncToken) {
    params.append('syncToken', options.syncToken);
    // syncToken 사용 시 삭제된 이벤트도 포함
    params.append('showDeleted', 'true');
    params.append('singleEvents', 'true');
    // syncToken + showDeleted 사용 시 orderBy는 사용하지 않음
  } else {
    if (options?.timeMin) params.append('timeMin', options.timeMin);
    if (options?.timeMax) params.append('timeMax', options.timeMax);
    params.append('singleEvents', 'true');
    params.append('orderBy', 'startTime');
  }

  if (options?.maxResults) params.append('maxResults', options.maxResults.toString());

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch calendar events');
  }

  return response.json();
}

// 이벤트 생성
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent
): Promise<GoogleCalendarEvent> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create calendar event');
  }

  return response.json();
}

// 이벤트 수정
export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<GoogleCalendarEvent> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update calendar event');
  }

  return response.json();
}

// 이벤트 삭제
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 410) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete calendar event');
  }
}

// 스케줄 -> Google Calendar 이벤트 변환
export function scheduleToGoogleEvent(
  schedule: {
    id: string;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    minutes: number;
  },
  projectName: string,
  projectId?: string
): GoogleCalendarEvent {
  const startTime = schedule.start_time || '09:00';
  const endTime = schedule.end_time || calculateEndTime(startTime, schedule.minutes);

  const title = projectName ? `[${projectName}] ${schedule.description || '업무'}` : schedule.description || '업무';

  return {
    summary: title,
    description: schedule.description || '',
    start: {
      dateTime: `${schedule.date}T${startTime}:00`,
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: `${schedule.date}T${endTime}:00`,
      timeZone: 'Asia/Seoul',
    },
    extendedProperties: {
      private: {
        projectId: projectId || '',
        projectName: projectName || '',
        scheduleId: schedule.id,
      },
    },
  };
}

// Google Calendar 이벤트 -> 스케줄 데이터 변환
export function googleEventToScheduleData(event: GoogleCalendarEvent): {
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  projectName: string | null;
  projectId: string | null;
  google_event_id: string;
  is_google_read_only: boolean;
} {
  // ISO 문자열에서 직접 날짜/시간 추출 (서버 시간대 영향 없음)
  // 형식: 2025-01-15T09:00:00+09:00 또는 2025-01-15T09:00:00
  const startStr = event.start.dateTime;
  const endStr = event.end.dateTime;

  // T 앞부분이 날짜, T와 + 또는 : 사이가 시간
  const date = startStr.split('T')[0]; // 2025-01-15
  const start_time = startStr.split('T')[1]?.slice(0, 5) || '09:00'; // 09:00
  const end_time = endStr.split('T')[1]?.slice(0, 5) || '18:00'; // 18:00

  // 제목에서 프로젝트명 파싱: [프로젝트명] 설명
  let projectName: string | null = null;
  let description = event.summary || '';

  const projectMatch = description.match(/^\[(.+?)\]\s*/);
  if (projectMatch) {
    projectName = projectMatch[1];
    description = description.replace(projectMatch[0], '');
  }

  // extendedProperties에서 프로젝트 정보 가져오기 (우선)
  if (event.extendedProperties?.private?.projectName) {
    projectName = event.extendedProperties.private.projectName;
  }

  // 읽기 전용 여부 판단
  // - 본인이 organizer가 아니고, guestsCanModify가 false인 경우 읽기 전용
  // - creator.self나 organizer.self가 true면 수정 가능
  const isCreator = event.creator?.self === true;
  const isOrganizer = event.organizer?.self === true;
  const canGuestsModify = event.guestsCanModify === true;

  // 본인이 생성자이거나 organizer이거나, 게스트 수정이 허용된 경우 수정 가능
  const isReadOnly = !isCreator && !isOrganizer && !canGuestsModify;

  return {
    date,
    start_time,
    end_time,
    description: description || event.description || '',
    projectName,
    projectId: event.extendedProperties?.private?.projectId || null,
    google_event_id: event.id || '',
    is_google_read_only: isReadOnly,
  };
}

// 시작 시간과 분으로 종료 시간 계산
function calculateEndTime(startTime: string, minutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}
