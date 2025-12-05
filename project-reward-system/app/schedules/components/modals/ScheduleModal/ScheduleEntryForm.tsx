'use client';

import { Trash2 } from 'lucide-react';
import type { Project } from '@/lib/supabase/database.types';
import type { ScheduleEntry } from '../../../types';
import { hourOptions, minuteOptions, getTimeHour, getTimeMinute, combineTime } from '../../../utils/time';

interface ScheduleEntryFormProps {
  entry: ScheduleEntry;
  index: number;
  projects: Project[];
  onUpdate: (index: number, updates: Partial<ScheduleEntry>) => void;
  onRemove: (index: number) => void;
}

export function ScheduleEntryForm({
  entry,
  index,
  projects,
  onUpdate,
  onRemove,
}: ScheduleEntryFormProps) {
  const handleStartHourChange = (hour: string) => {
    const minute = getTimeMinute(entry.startTime);
    const newStartTime = combineTime(hour, minute);
    onUpdate(index, { startTime: newStartTime });

    // 종료시간 자동 계산
    const hours = parseInt(entry.hours || '0');
    const mins = parseInt(entry.minutes || '0');
    if (hours > 0 || mins > 0) {
      const startMinutes = parseInt(hour) * 60 + parseInt(minute || '0');
      const endMinutes = startMinutes + hours * 60 + mins;
      const endHour = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
      const endMin = String(endMinutes % 60).padStart(2, '0');
      onUpdate(index, { startTime: newStartTime, endTime: combineTime(endHour, endMin) });
    }
  };

  const handleStartMinuteChange = (minute: string) => {
    const hour = getTimeHour(entry.startTime);
    const newStartTime = combineTime(hour, minute);
    onUpdate(index, { startTime: newStartTime });

    // 종료시간 자동 계산
    const hours = parseInt(entry.hours || '0');
    const mins = parseInt(entry.minutes || '0');
    if (hours > 0 || mins > 0) {
      const startMinutes = parseInt(hour || '0') * 60 + parseInt(minute);
      const endMinutes = startMinutes + hours * 60 + mins;
      const endHour = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
      const endMin = String(endMinutes % 60).padStart(2, '0');
      onUpdate(index, { startTime: newStartTime, endTime: combineTime(endHour, endMin) });
    }
  };

  const handleEndHourChange = (hour: string) => {
    const minute = getTimeMinute(entry.endTime);
    const newEndTime = combineTime(hour, minute);
    onUpdate(index, { endTime: newEndTime });

    // 업무시간 자동 계산
    const startMinutes = parseInt(getTimeHour(entry.startTime) || '0') * 60 + parseInt(getTimeMinute(entry.startTime) || '0');
    const endMinutes = parseInt(hour) * 60 + parseInt(minute || '0');
    const duration = Math.max(0, endMinutes - startMinutes);
    onUpdate(index, {
      endTime: newEndTime,
      hours: String(Math.floor(duration / 60)),
      minutes: String(duration % 60),
    });
  };

  const handleEndMinuteChange = (minute: string) => {
    const hour = getTimeHour(entry.endTime);
    const newEndTime = combineTime(hour, minute);
    onUpdate(index, { endTime: newEndTime });

    // 업무시간 자동 계산
    const startMinutes = parseInt(getTimeHour(entry.startTime) || '0') * 60 + parseInt(getTimeMinute(entry.startTime) || '0');
    const endMinutes = parseInt(hour || '0') * 60 + parseInt(minute);
    const duration = Math.max(0, endMinutes - startMinutes);
    onUpdate(index, {
      endTime: newEndTime,
      hours: String(Math.floor(duration / 60)),
      minutes: String(duration % 60),
    });
  };

  const handleDurationChange = (type: 'hours' | 'minutes', value: string) => {
    const updates: Partial<ScheduleEntry> = { [type]: value };

    // 종료시간 자동 계산
    const hours = type === 'hours' ? parseInt(value || '0') : parseInt(entry.hours || '0');
    const mins = type === 'minutes' ? parseInt(value || '0') : parseInt(entry.minutes || '0');
    const startMinutes = parseInt(getTimeHour(entry.startTime) || '0') * 60 + parseInt(getTimeMinute(entry.startTime) || '0');
    const endMinutes = startMinutes + hours * 60 + mins;
    const endHour = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
    const endMin = String(endMinutes % 60).padStart(2, '0');

    updates.endTime = combineTime(endHour, endMin);
    onUpdate(index, updates);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
      {/* 프로젝트 선택 및 삭제 버튼 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <select
            value={entry.projectId ?? ''}
            onChange={(e) => onUpdate(index, { projectId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="__none__" disabled>프로젝트를 선택해주세요</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
            <option value="">기타</option>
          </select>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 시간 입력 영역 */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* 시작 시간 */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600 w-16">시작시간</span>
          <select
            value={getTimeHour(entry.startTime)}
            onChange={(e) => handleStartHourChange(e.target.value)}
            className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">시</option>
            {hourOptions.map((h) => (
              <option key={h.value} value={String(h.value).padStart(2, '0')}>{h.label}</option>
            ))}
          </select>
          <select
            value={getTimeMinute(entry.startTime)}
            onChange={(e) => handleStartMinuteChange(e.target.value)}
            className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">분</option>
            {minuteOptions.map((m) => (
              <option key={m} value={String(m).padStart(2, '0')}>{m}분</option>
            ))}
          </select>
        </div>

        {/* 종료 시간 */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600 w-16">종료시간</span>
          <select
            value={getTimeHour(entry.endTime)}
            onChange={(e) => handleEndHourChange(e.target.value)}
            className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">시</option>
            {hourOptions.map((h) => (
              <option key={h.value} value={String(h.value).padStart(2, '0')}>{h.label}</option>
            ))}
          </select>
          <select
            value={getTimeMinute(entry.endTime)}
            onChange={(e) => handleEndMinuteChange(e.target.value)}
            className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">분</option>
            {minuteOptions.map((m) => (
              <option key={m} value={String(m).padStart(2, '0')}>{m}분</option>
            ))}
          </select>
        </div>

        {/* 구분선 */}
        <div className="h-8 w-px bg-gray-300 hidden sm:block" />

        {/* 업무 시간 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 w-16">업무시간</span>
          <input
            type="number"
            min="0"
            max="24"
            value={entry.hours}
            onChange={(e) => handleDurationChange('hours', e.target.value)}
            className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-600 text-sm">시간</span>
          <select
            value={entry.minutes}
            onChange={(e) => handleDurationChange('minutes', e.target.value)}
            className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="0">0</option>
            <option value="15">15</option>
            <option value="30">30</option>
            <option value="45">45</option>
          </select>
          <span className="text-gray-600 text-sm">분</span>
        </div>
      </div>

      {/* 업무 내용 */}
      <div className="mt-3">
        <label className="block text-sm text-gray-600 mb-1">업무 내용</label>
        <textarea
          value={entry.description}
          onChange={(e) => onUpdate(index, { description: e.target.value })}
          placeholder="업무내용을 입력하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
