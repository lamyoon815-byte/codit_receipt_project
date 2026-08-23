import type {
  AIReportResponse,
  ComparisonResponse,
  MonthlySummaryResponse,
  PaginatedReceiptsResponse,
  PeriodSummaryResponse,
  ReceiptResponse,
  TrendPeriod,
  TrendResponse,
} from '../types/api';
import { apiGet } from './apiClient';

const RECEIPTS_PATH = '/api/receipts';

export function getMonthlySummary(month: string, signal?: AbortSignal) {
  return apiGet<MonthlySummaryResponse>(`${RECEIPTS_PATH}/summary/monthly`, { month }, signal);
}

export function getSpendingTrend(period: TrendPeriod, count: number, signal?: AbortSignal) {
  return apiGet<TrendResponse>(`${RECEIPTS_PATH}/stats/trend`, { period, count }, signal);
}

export function getPeriodSummary(period: TrendPeriod, date: string, signal?: AbortSignal) {
  return apiGet<PeriodSummaryResponse>(`${RECEIPTS_PATH}/stats/summary`, { period, date }, signal);
}

export function getMonthlyComparison(month: string, signal?: AbortSignal) {
  return apiGet<ComparisonResponse>(`${RECEIPTS_PATH}/stats/comparison`, { month }, signal);
}

export function getReceipts(signal?: AbortSignal) {
  return apiGet<ReceiptResponse[] | PaginatedReceiptsResponse>(`${RECEIPTS_PATH}/`, {}, signal);
}

export function getAIReport(month: string, signal?: AbortSignal) {
  return apiGet<AIReportResponse>(`${RECEIPTS_PATH}/report/ai`, { month }, signal);
}
