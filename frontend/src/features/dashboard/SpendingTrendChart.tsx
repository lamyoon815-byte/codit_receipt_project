import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendChartDatum } from '../../hooks/useDashboardCharts';
import { formatWon } from '../../utils/currency';

export function SpendingTrendChart({ data }: { data: TrendChartDatum[] }) {
  if (data.length === 0) return <div className="chart-empty">최근 소비 데이터가 없습니다.</div>;

  const formatDateLabel = (label: string) => {
    const match = label.match(/^\d{4}-(\d{2})-(\d{2})$/);
    return match ? `${Number(match[1])}/${Number(match[2])}` : label;
  };

  return (
    <ResponsiveContainer width="100%" height={270}>
      <LineChart data={data} margin={{ top: 20, right: 18, left: 12, bottom: 0 }}>
        <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={13} tickFormatter={formatDateLabel} padding={{ left: 18, right: 18 }} />
        <YAxis width={72} axisLine={false} tickLine={false} tickMargin={12} tickFormatter={(value) => `₩${Number(value).toLocaleString('ko-KR')}`} />
        <Tooltip formatter={(value) => formatWon(Number(value))} />
        <Line type="linear" dataKey="amount" name="소비 금액" stroke="#2768E8" strokeWidth={3} dot={{ r: 5, fill: '#2768E8' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
