import { CategoryBadge } from '../../components/common/CategoryBadge';
import type { Expense } from '../../types/expense';
import { formatWon } from '../../utils/currency';

export function RecentExpenses({ expenses, isLoading = false }: { expenses: Expense[]; isLoading?: boolean }) {
  if (isLoading) return <div className="list-state">최근 소비 내역을 불러오는 중입니다.</div>;
  if (expenses.length === 0) return <div className="list-state">저장된 소비 내역이 없습니다.</div>;

  return (
    <div className="expense-list">
      {expenses.map((expense) => (
        <article key={expense.id}>
          <span>{expense.merchant}</span>
          <CategoryBadge category={expense.category} />
          <time dateTime={expense.purchasedAt}>{expense.purchasedAt}</time>
          <strong>{formatWon(expense.amount)}</strong>
        </article>
      ))}
    </div>
  );
}
