import { Card } from '../components/common/Card';
import { RecentExpenses } from '../features/dashboard/RecentExpenses';
import { useDashboardCharts } from '../hooks/useDashboardCharts';

export function ExpensesPage() {
  const { recentExpenses, isLoading, error } = useDashboardCharts();
  return (
    <div className="page">
      <h1>소비 내역</h1>
      {error && <div className="dashboard-notice" role="status">{error}</div>}
      <Card title="최근 내역"><RecentExpenses expenses={recentExpenses} isLoading={isLoading} /></Card>
    </div>
  );
}
