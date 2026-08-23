import type { Expense, SpendingSummary } from '../types/expense';

export const summary: SpendingSummary = { today: 32500, week: 154200, month: 483500, previousMonthChange: 12.4 };

export const recentExpenses: Expense[] = [
  { id: '1', merchant: '스타벅스 숙명여대점', amount: 5800, purchasedAt: '오늘 14:52', category: 'cafe' },
  { id: '2', merchant: 'GS25 숙대입구점', amount: 4200, purchasedAt: '오늘 12:18', category: 'food' },
  { id: '3', merchant: '올리브영 명동점', amount: 28000, purchasedAt: '어제 18:33', category: 'living' },
  { id: '4', merchant: 'CGV 용산아이파크몰', amount: 15000, purchasedAt: '8/15 20:41', category: 'culture' },
];

export const weeklySpending = [
  { day: '월', amount: 23000 }, { day: '화', amount: 18500 }, { day: '수', amount: 39500 },
  { day: '목', amount: 24500 }, { day: '금', amount: 41000 }, { day: '토', amount: 67500 }, { day: '일', amount: 41000 },
];

export const categorySpending = [
  { category: 'food', value: 154000 }, { category: 'cafe', value: 92000 },
  { category: 'shopping', value: 87000 }, { category: 'transport', value: 63000 },
  { category: 'culture', value: 51000 }, { category: 'living', value: 35500 },
] as const;
