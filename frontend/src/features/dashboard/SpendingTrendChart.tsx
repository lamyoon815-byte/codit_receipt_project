import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendChartDatum } from '../../hooks/useDashboardCharts';
import { formatWon } from '../../utils/currency';

export function SpendingTrendChart({ data }: { data: TrendChartDatum[] }) {
  if (data.length === 0) return <div className="chart-empty">최근 소비 데이터가 없습니다.</div>;

  return (
    <ResponsiveContainer width="100%" height={270}>
      <LineChart data={data} margin={{ top: 20, right: 12, left: -10, bottom: 0 }}>
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${Number(value) / 1000}K`} />
        <Tooltip formatter={(value) => formatWon(Number(value))} />
        <Line type="linear" dataKey="amount" name="소비 금액" stroke="#2768E8" strokeWidth={3} dot={{ r: 5, fill: '#2768E8' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
