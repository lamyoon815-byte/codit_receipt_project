import { CalendarDays, ReceiptText, TrendingUp, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../components/common/Card';
import { CategoryDonutChart } from '../features/dashboard/CategoryDonutChart';
import { RecentExpenses } from '../features/dashboard/RecentExpenses';
import { SpendingTrendChart } from '../features/dashboard/SpendingTrendChart';
import { SummaryCard } from '../features/dashboard/SummaryCard';
import { useDashboardCharts } from '../hooks/useDashboardCharts';
import { formatWon } from '../utils/currency';

export function DashboardPage() {
  const [categoryPeriod, setCategoryPeriod] = useState<'month' | 'week'>('month');
  const { categoryData, weeklyCategoryData, trendData, summary, recentExpenses, isLoading, error } = useDashboardCharts();
  const chartLoading = isLoading ? <div className="chart-state">소비 데이터를 불러오는 중입니다.</div> : null;
  const difference = summary.previousMonthDifference;
  const visibleCategoryData = categoryPeriod === 'month' ? categoryData : weeklyCategoryData;

  return (
    <div className="dashboard">
      {error && <div className="dashboard-notice" role="status">{error}</div>}
      <div className="summary-grid">
        <SummaryCard
          label="오늘 소비" amount={summary.today?.total_spent ?? null}
          detail={`${summary.today?.payment_count ?? 0}건`} icon={ReceiptText} tone="green"
        />
        <SummaryCard
          label="이번 주 소비" amount={summary.week?.total_spent ?? null}
          detail={`${summary.week?.payment_count ?? 0}건`} icon={CalendarDays} tone="blue"
        />
        <SummaryCard
          label="이번 달 소비" amount={summary.month?.total_spent ?? null}
          detail={`${summary.month?.payment_count ?? 0}건`} icon={WalletCards} tone="orange"
        />
        <SummaryCard
          label="전월 대비" amount={summary.previousMonthChange}
          detail={`${difference >= 0 ? '+' : '-'} ${formatWon(Math.abs(difference))}`}
          icon={TrendingUp} tone="red" percentage
        />
      </div>
      <div className="analytics-grid">
        <Card title="최근 7일 소비 추이">
          {chartLoading ?? <SpendingTrendChart data={trendData} />}
        </Card>
        <Card
          title="카테고리별 소비 비율"
          action={(
            <div className="trend-mode-toggle" aria-label="카테고리 소비 집계 기간">
              <button type="button" className={categoryPeriod === 'month' ? 'active' : ''} onClick={() => setCategoryPeriod('month')}>월</button>
              <button type="button" className={categoryPeriod === 'week' ? 'active' : ''} onClick={() => setCategoryPeriod('week')}>주</button>
            </div>
          )}
        >
          {chartLoading ?? <CategoryDonutChart data={visibleCategoryData} />}
        </Card>
      </div>
      <Card title="최근 소비 내역">
        <RecentExpenses expenses={recentExpenses} isLoading={isLoading} />
      </Card>
    </div>
  );
}
