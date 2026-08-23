export type ExpenseCategory = 'food' | 'cafe' | 'shopping' | 'transport' | 'living' | 'medical' | 'culture' | 'other';

export interface CategoryMeta {
  label: string;
  chart: string;
  background: string;
  text: string;
}

export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  purchasedAt: string;
  category: ExpenseCategory;
}

export interface SpendingSummary {
  today: number;
  week: number;
  month: number;
  previousMonthChange: number;
}
