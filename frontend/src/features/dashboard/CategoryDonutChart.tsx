import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_META } from '../../constants/categories';
import type { CategoryChartDatum } from '../../hooks/useDashboardCharts';
import { formatWon } from '../../utils/currency';

export function CategoryDonutChart({ data }: { data: CategoryChartDatum[] }) {
  if (data.length === 0) return <div className="chart-empty">이번 달 소비 데이터가 없습니다.</div>;

  return (
    <div className="donut-layout">
      <ResponsiveContainer width="58%" height={270}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="category" innerRadius={58} outerRadius={92} paddingAngle={1}>
            {data.map(({ category }) => <Cell key={category} fill={CATEGORY_META[category].chart} />)}
          </Pie>
          <Tooltip
            formatter={(value) => formatWon(Number(value))}
            labelFormatter={(category) => CATEGORY_META[String(category) as keyof typeof CATEGORY_META]?.label ?? String(category)}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="legend">
        {data.map(({ category, percentage }) => (
          <li key={category}>
            <i style={{ background: CATEGORY_META[category].chart }} />
            {CATEGORY_META[category].label}
            <span>{percentage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
