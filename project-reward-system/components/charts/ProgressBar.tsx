'use client';

import { useEffect, useState } from 'react';

interface ProgressBarProps {
  planned: number;
  actual: number;
  label?: string;
  showValues?: boolean;
  unit?: string;
}

export default function ProgressBar({
  planned,
  actual,
  label,
  showValues = true,
  unit = '일',
}: ProgressBarProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const percent = planned > 0 ? (actual / planned) * 100 : 0;
  const isOverBudget = actual > planned;
  const saved = Number((planned - actual).toFixed(1));
  const formattedPlanned = Number(Number(planned).toFixed(1));
  const formattedActual = Number(Number(actual).toFixed(1));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(Math.min(percent, 150)); // 최대 150%까지만 표시
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  const getBarColor = () => {
    if (percent <= 80) return 'bg-green-500';
    if (percent <= 100) return 'bg-blue-500';
    if (percent <= 120) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{label}</span>
          {showValues && (
            <span className="text-sm font-medium text-gray-900">
              {formattedActual}{unit} / {formattedPlanned}{unit}
            </span>
          )}
        </div>
      )}

      {/* 진행률 바 */}
      <div className="relative">
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          {/* 100% 기준선 */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gray-400 z-10"
            style={{ left: `${Math.min(100, 100 / (animatedPercent / 100 || 1))}%` }}
          />

          {/* 실제 진행률 */}
          <div
            className={`h-full ${getBarColor()} transition-all duration-1000 ease-out rounded-full`}
            style={{ width: `${Math.min(animatedPercent, 100)}%` }}
          />

          {/* 초과분 (빨간색으로 표시) */}
          {animatedPercent > 100 && (
            <div
              className="absolute top-0 h-full bg-red-400 transition-all duration-1000 ease-out"
              style={{
                left: '100%',
                width: `${Math.min(animatedPercent - 100, 50)}%`,
                transform: 'translateX(-100%)',
              }}
            />
          )}
        </div>

        {/* 퍼센트 라벨 */}
        <div
          className="absolute top-0 h-4 flex items-center justify-end pr-2 text-xs font-medium text-white transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(animatedPercent, 100)}%` }}
        >
          {animatedPercent >= 20 && `${Math.round(percent)}%`}
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${
          saved > 0 ? 'text-green-600' : saved < 0 ? 'text-red-600' : 'text-gray-500'
        }`}>
          {saved > 0 ? `${saved}${unit} 절약` : saved < 0 ? `${Number(Math.abs(saved).toFixed(1))}${unit} 초과` : '예상과 동일'}
        </span>
        <span className={`text-xs ${
          percent <= 100 ? 'text-green-600' : 'text-red-600'
        }`}>
          {percent <= 100 ? '예산 내' : '예산 초과'}
        </span>
      </div>
    </div>
  );
}
