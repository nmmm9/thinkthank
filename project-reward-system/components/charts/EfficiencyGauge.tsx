'use client';

import { useEffect, useState, useRef } from 'react';

interface EfficiencyGaugeProps {
  value: number; // -100 to +100
  size?: number;
  label?: string;
}

export default function EfficiencyGauge({
  value,
  size = 160,
  label = '효율성',
}: EfficiencyGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    startValueRef.current = animatedValue;
    startTimeRef.current = null;
    const duration = 1000; // 1초 동안 애니메이션

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out 효과
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValueRef.current + (value - startValueRef.current) * easeOut;
      setAnimatedValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  // 게이지 계산 (-100 ~ +100을 0 ~ 180도로 변환)
  const normalizedValue = Math.max(-100, Math.min(100, animatedValue));
  const angle = ((normalizedValue + 100) / 200) * 180;

  // 색상 결정
  const getColor = (val: number) => {
    if (val > 20) return '#10b981'; // green-500
    if (val > 0) return '#34d399'; // green-400
    if (val === 0) return '#9ca3af'; // gray-400
    if (val > -20) return '#fbbf24'; // yellow-400
    return '#ef4444'; // red-500
  };

  const color = getColor(normalizedValue);

  // SVG 경로 계산
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) - 15;

  // 배경 호 (회색)
  const backgroundArc = describeArc(centerX, centerY, radius, 0, 180);

  // 값 호
  const valueArc = describeArc(centerX, centerY, radius, 0, angle);

  // 바늘 위치 (왼쪽 -100% → 위쪽 0% → 오른쪽 +100%)
  const needleAngle = (180 + angle) * (Math.PI / 180);
  const needleLength = radius - 10;
  const needleX = centerX + needleLength * Math.cos(needleAngle);
  const needleY = centerY + needleLength * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* 배경 호 */}
        <path
          d={backgroundArc}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* 값 호 */}
        <path
          d={valueArc}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* 바늘 */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#374151"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 중심점 */}
        <circle cx={centerX} cy={centerY} r="6" fill="#374151" />

        {/* 라벨들 */}
        <text x="15" y={centerY + 20} fontSize="10" fill="#9ca3af">-100%</text>
        <text x={size - 35} y={centerY + 20} fontSize="10" fill="#9ca3af">+100%</text>
      </svg>

      {/* 값 표시 */}
      <div className="text-center -mt-2">
        <div
          className="text-2xl font-bold transition-colors duration-500"
          style={{ color }}
        >
          {Math.round(normalizedValue) > 0 ? '+' : ''}{Math.round(normalizedValue)}%
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// SVG 호 경로 생성 함수
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle - 180);
  const end = polarToCartesian(x, y, radius, startAngle - 180);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
