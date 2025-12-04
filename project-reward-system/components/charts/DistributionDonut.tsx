'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DistributionDonutProps {
  companyShare: number;
  teamShare: number;
  companyPercent: number;
  teamPercent: number;
}

export default function DistributionDonut({
  companyShare,
  teamShare,
  companyPercent,
  teamPercent,
}: DistributionDonutProps) {
  const data = [
    { name: '회사', value: companyShare, percent: companyPercent, color: '#6b7280' },
    { name: '팀원', value: teamShare, percent: teamPercent, color: '#10b981' },
  ];

  const COLORS = ['#6b7280', '#10b981'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{item.name} 배분</p>
          <p className="text-sm text-gray-600">{item.value.toLocaleString()}원</p>
          <p className="text-xs text-gray-400">{item.percent}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div>
              <span className="text-sm text-gray-600">{item.name}</span>
              <span className="text-sm font-medium text-gray-900 ml-2">
                {item.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
