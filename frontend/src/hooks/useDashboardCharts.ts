import { useEffect, useState } from 'react';
import { normalizeCategory } from '../constants/categories';
import {
  getMonthlyComparison,
  getMonthlySummary,
  getPeriodSummary,
  getReceipts,
  getSpendingTrend,
} from '../services/receiptApi';
import type { PeriodSummaryResponse, ReceiptResponse } from '../types/api';
import type { Expense, ExpenseCategory } from '../types/expense';

export interface CategoryChartDatum { category: ExpenseCategory; value: number; percentage: number }
export interface TrendChartDatum { label: string; amount: number }

export interface DashboardSummary {
  today: PeriodSummaryResponse | null;
  week: PeriodSummaryResponse | null;
  month: PeriodSummaryResponse | null;
  previousMonthChange: number | null;
  previousMonthDifference: number;
}

interface DashboardState {
  categoryData: CategoryChartDatum[];
  weeklyCategoryData: CategoryChartDatum[];
  trendData: TrendChartDatum[];
  summary: DashboardSummary;
  recentExpenses: Expense[];
  isLoading: boolean;
  error: string | null;
}

const EMPTY_SUMMARY: DashboardSummary = {
  today: null, week: null, month: null, previousMonthChange: null, previousMonthDifference: 0,
};

function getKoreanDateParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const year = value('year');
  const month = value('month');
  return { today: `${year}-${month}-${value('day')}`, month: `${year}-${month}` };
}

function inferReceiptCategory(receipt: ReceiptResponse): ExpenseCategory {
  if (receipt.main_category) return normalizeCategory(receipt.main_category);
  const totals = new Map<ExpenseCategory, number>();
  receipt.items?.forEach((item) => {
    const category = normalizeCategory(item.category);
    totals.set(category, (totals.get(category) ?? 0) + Number(item.price || 0));
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

function toRecentExpenses(response: ReceiptResponse[] | { items: ReceiptResponse[] }): Expense[] {
  const receipts = Array.isArray(response) ? response : response.items;
  return [...receipts]
    .sort((a, b) => `${b.date}${b.created_at ?? ''}`.localeCompare(`${a.date}${a.created_at ?? ''}`))
    .slice(0, 4)
    .map((receipt) => ({
      id: String(receipt.id),
      merchant: receipt.store_name,
      amount: Number(receipt.total_amount),
      purchasedAt: receipt.date,
      category: inferReceiptCategory(receipt),
    }));
}

function toWeeklyCategoryData(
  response: ReceiptResponse[] | { items: ReceiptResponse[] },
  startDate: string,
  endDate: string,
): CategoryChartDatum[] {
  const receipts = Array.isArray(response) ? response : response.items;
  const totals = new Map<ExpenseCategory, number>();

  receipts
    .filter((receipt) => receipt.date >= startDate && receipt.date <= endDate)
    .forEach((receipt) => receipt.items.forEach((item) => {
      const category = normalizeCategory(item.category);
      totals.set(category, (totals.get(category) ?? 0) + Number(item.price || 0));
    }));

  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals.entries()]
    .map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

export function useDashboardCharts(monthOverride?: string): DashboardState {
  const [state, setState] = useState<DashboardState>({
    categoryData: [], weeklyCategoryData: [], trendData: [], summary: EMPTY_SUMMARY, recentExpenses: [],
    isLoading: true, error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      const current = getKoreanDateParts();
      const month = monthOverride ?? current.month;
      const today = monthOverride ? `${month}-01` : current.today;
      const results = await Promise.allSettled([
        getMonthlySummary(month, controller.signal),
        getSpendingTrend('day', 7, controller.signal),
        getPeriodSummary('day', today, controller.signal),
        getPeriodSummary('week', today, controller.signal),
        getPeriodSummary('month', today, controller.signal),
        getMonthlyComparison(month, controller.signal),
        getReceipts(controller.signal),
      ] as const);

      if (controller.signal.aborted) return;
      const [monthlyResult, trendResult, dayResult, weekResult, monthResult, comparisonResult, receiptsResult] = results;
      const monthly = fulfilled(monthlyResult);
      const trend = fulfilled(trendResult);
      const comparison = fulfilled(comparisonResult);
      const receipts = fulfilled(receiptsResult);
      const week = fulfilled(weekResult);
      const failedCount = results.filter((result) => result.status === 'rejected').length;

      setState({
        categoryData: monthly?.category_breakdown.map((item) => ({
          category: normalizeCategory(item.category), value: Number(item.amount), percentage: Number(item.percentage),
        })) ?? [],
        weeklyCategoryData: receipts && week
          ? toWeeklyCategoryData(receipts, week.start_date, week.end_date)
          : [],
        trendData: trend?.points.map((point) => ({ label: point.label, amount: Number(point.amount) })) ?? [],
        summary: {
          today: fulfilled(dayResult),
          week,
          month: fulfilled(monthResult),
          previousMonthChange: comparison?.total_change_rate ?? null,
          previousMonthDifference: comparison ? Number(comparison.total_current) - Number(comparison.total_previous) : 0,
        },
        recentExpenses: receipts ? toRecentExpenses(receipts) : [],
        isLoading: false,
        error: failedCount === results.length
          ? '백엔드에 연결할 수 없습니다. 서버와 CORS 설정을 확인해 주세요.'
          : failedCount > 0
            ? '일부 데이터를 불러오지 못했습니다.'
            : null,
      });
    }

    void loadDashboard();
    return () => controller.abort();
  }, [monthOverride]);

  return state;
}
