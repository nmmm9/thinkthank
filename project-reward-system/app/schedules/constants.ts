// 타임라인 설정
export const HOUR_HEIGHT = 40; // 1시간 = 40px
export const START_HOUR = 0; // 시작 시간 (오전 0시)
export const END_HOUR = 24; // 종료 시간 (오후 12시)
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const TOP_PADDING = 8; // pt-2 = 8px

// 프로젝트 색상 배정 (더 선명한 색상)
export const projectColors = [
  { key: 'blue', bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', light: 'bg-blue-100', hex: '#3b82f6' },
  { key: 'green', bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', light: 'bg-green-100', hex: '#22c55e' },
  { key: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-white', light: 'bg-purple-100', hex: '#a855f7' },
  { key: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-white', light: 'bg-orange-100', hex: '#f97316' },
  { key: 'pink', bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-white', light: 'bg-pink-100', hex: '#ec4899' },
  { key: 'teal', bg: 'bg-teal-500', hover: 'hover:bg-teal-600', text: 'text-white', light: 'bg-teal-100', hex: '#14b8a6' },
  { key: 'indigo', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-white', light: 'bg-indigo-100', hex: '#6366f1' },
  { key: 'red', bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', light: 'bg-red-100', hex: '#ef4444' },
  { key: 'yellow', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-white', light: 'bg-yellow-100', hex: '#eab308' },
  { key: 'cyan', bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600', text: 'text-white', light: 'bg-cyan-100', hex: '#06b6d4' },
];

// 색상 타입
export type ProjectColor = typeof projectColors[number];
