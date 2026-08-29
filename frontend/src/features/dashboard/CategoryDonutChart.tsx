import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_META } from '../../constants/categories';
import type { CategoryChartDatum } from '../../hooks/useDashboardCharts';
import { formatWon } from '../../utils/currency';

const RADIAN = Math.PI / 180;

interface DonutLabelProps {
  cx?: number | string;
  cy?: number | string;
  midAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  percent?: number;
}

function renderPercentageLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: DonutLabelProps) {
  const centerX = Number(cx);
  const centerY = Number(cy);
  const inner = Number(innerRadius);
  const outer = Number(outerRadius);
  const ratio = Number(percent);
  const angle = Number(midAngle);
  const isSmallSlice = ratio < 0.04;
  const radius = isSmallSlice ? outer + 9 : inner + (outer - inner) * 0.58;
  const x = centerX + radius * Math.cos(-angle * RADIAN);
  const y = centerY + radius * Math.sin(-angle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={isSmallSlice ? '#36527d' : '#ffffff'}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={700}
      pointerEvents="none"
    >
      {(ratio * 100).toFixed(1)}%
    </text>
  );
}

export function CategoryDonutChart({ data }: { data: CategoryChartDatum[] }) {
  if (data.length === 0) return <div className="chart-empty">이번 달 소비 데이터가 없습니다.</div>;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="donut-layout">
      <div className="donut-chart-wrap">
        <ResponsiveContainer width="100%" height={290}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="category"
              cx="45%"
              cy="50%"
              innerRadius={54}
              outerRadius={106}
              paddingAngle={1}
              label={renderPercentageLabel}
              labelLine={false}
            >
              {data.map(({ category }) => <Cell key={category} fill={CATEGORY_META[category].chart} />)}
            </Pie>
            <Tooltip
              formatter={(value) => formatWon(Number(value))}
              labelFormatter={(category) => CATEGORY_META[String(category) as keyof typeof CATEGORY_META]?.label ?? String(category)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center-label"><span>총 소비</span><strong>{formatWon(total)}</strong></div>
      </div>
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
