import { CATEGORY_META } from '../../constants/categories';
import type { ExpenseCategory } from '../../types/expense';

export function CategoryBadge({ category }: { category: ExpenseCategory }) {
  const meta = CATEGORY_META[category];
  return <span className="category-badge" style={{ color: meta.text, background: meta.background }}>{meta.label}</span>;
}
