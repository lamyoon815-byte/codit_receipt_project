import { Card } from '../components/common/Card';
import { CategoryDonutChart } from '../features/dashboard/CategoryDonutChart';
import { SpendingTrendChart } from '../features/dashboard/SpendingTrendChart';
import { useDashboardCharts } from '../hooks/useDashboardCharts';

export function AnalyticsPage() {
  const { categoryData, trendData, isLoading, error } = useDashboardCharts();
  const status = isLoading
    ? <div className="chart-state">소비 데이터를 불러오는 중입니다.</div>
    : error && categoryData.length === 0 && trendData.length === 0
      ? <div className="chart-state chart-error">{error}</div>
      : null;

  return (
    <div className="page">
      <h1>소비 분석</h1>
      <div className="two-column">
        <Card title="카테고리별 소비">{status ?? <CategoryDonutChart data={categoryData} />}</Card>
        <Card title="최근 7일 소비 추이">{status ?? <SpendingTrendChart data={trendData} />}</Card>
      </div>
    </div>
  );
}
