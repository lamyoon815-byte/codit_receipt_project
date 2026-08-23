export interface MonthlyCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlySummaryResponse {
  month: string;
  total_spent: number;
  category_breakdown: MonthlyCategoryBreakdown[];
}

export type TrendPeriod = 'day' | 'week' | 'month';

export interface TrendPointResponse {
  label: string;
  amount: number;
}

export interface TrendResponse {
  period: TrendPeriod;
  points: TrendPointResponse[];
}

export interface ReceiptItemResponse {
  name: string;
  price: number;
  category: string;
}

export interface ReceiptResponse {
  id: number;
  store_name: string;
  date: string;
  total_amount: number;
  items: ReceiptItemResponse[];
  created_at: string;
  main_category?: string;
}

export interface PaginatedReceiptsResponse {
  items: ReceiptResponse[];
}

export interface PeriodSummaryResponse {
  period: TrendPeriod;
  start_date: string;
  end_date: string;
  total_spent: number;
  payment_count: number;
}

export interface ComparisonResponse {
  current_month: string;
  previous_month: string;
  total_current: number;
  total_previous: number;
  total_change_rate: number | null;
}

export interface AIReportResponse {
  month: string;
  summary: string;
  highlights: string[];
  advice: string;
}
