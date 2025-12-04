'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MemberData {
  memberName: string;
  plannedDays: number;
  actualDays: number;
  savedDays: number;
  efficiencyRate: number;
  shareAmount: number;
}

interface MemberComparisonChartProps {
  data: MemberData[];
}

export default function MemberComparisonChart({ data }: MemberComparisonChartProps) {
  const chartData = data.map((item) => ({
    name: item.memberName,
    예상: item.plannedDays,
    실제: item.actualDays,
    절약: item.savedDays,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const memberData = data.find((d) => d.memberName === label);
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              예상: <span className="font-medium">{memberData?.plannedDays}일</span>
            </p>
            <p className="text-sm text-gray-600">
              실제: <span className="font-medium">{memberData?.actualDays}일</span>
            </p>
            <p className={`text-sm font-medium ${(memberData?.savedDays || 0) > 0 ? 'text-green-600' : (memberData?.savedDays || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              절약: {(memberData?.savedDays || 0) > 0 ? '+' : ''}{memberData?.savedDays}일
            </p>
            <p className={`text-sm font-medium ${(memberData?.efficiencyRate || 0) > 0 ? 'text-green-600' : (memberData?.efficiencyRate || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              효율: {(memberData?.efficiencyRate || 0) > 0 ? '+' : ''}{memberData?.efficiencyRate}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            label={{ value: '일수', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#9ca3af' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
          />
          <Bar
            dataKey="예상"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
          />
          <Bar
            dataKey="실제"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
            animationBegin={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
