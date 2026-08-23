import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, ReceiptText, Utensils, WalletCards } from 'lucide-react';
import { CATEGORY_META } from '../constants/categories';
import { useDashboardCharts } from '../hooks/useDashboardCharts';
import { getReceipts } from '../services/receiptApi';
import type { ReceiptResponse } from '../types/api';
import type { ExpenseCategory } from '../types/expense';

const categoryLabels: Record<ExpenseCategory, string> = { food: '식비', cafe: '카페·간식', shopping: '쇼핑', transport: '교통', living: '생활·생필품', medical: '의료·건강', culture: '문화·여가', other: '기타' };
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const displayWeekdays = ['월', '화', '수', '목', '금', '토', '일'];

function formatWon(value: number) { return `₩${Math.round(value).toLocaleString('ko-KR')}`; }
export function AnalyticsPage() {
  const { categoryData, trendData, summary, isLoading, error } = useDashboardCharts();
  const [receipts, setReceipts] = useState<ReceiptResponse[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getReceipts(controller.signal).then((data) => setReceipts(Array.isArray(data) ? data : data.items)).catch(() => setReceipts([]));
    return () => controller.abort();
  }, []);

  const analytics = useMemo(() => {
    const items = new Map<string, { count: number; amount: number }>();
    const stores = new Map<string, { count: number; amount: number }>();
    const daily = new Map<string, { total: number; dates: Set<string> }>();
    receipts.forEach((receipt) => {
      const store = stores.get(receipt.store_name) ?? { count: 0, amount: 0 };
      stores.set(receipt.store_name, { count: store.count + 1, amount: store.amount + receipt.total_amount });
      receipt.items.forEach((item) => { const saved = items.get(item.name) ?? { count: 0, amount: 0 }; items.set(item.name, { count: saved.count + 1, amount: saved.amount + item.price }); });
      const day = weekdays[new Date(`${receipt.date}T00:00:00`).getDay()];
      const savedDay = daily.get(day) ?? { total: 0, dates: new Set<string>() };
      savedDay.total += receipt.total_amount; savedDay.dates.add(receipt.date); daily.set(day, savedDay);
    });
    const ranked = (map: Map<string, { count: number; amount: number }>) => [...map].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.count - a.count).slice(0, 5);
    return {
      items: ranked(items), stores: ranked(stores),
      days: displayWeekdays.map((day) => { const value = daily.get(day); return { day, amount: value ? Math.round(value.total / value.dates.size) : 0 }; }),
    };
  }, [receipts]);

  const total = summary.month?.total_spent ?? categoryData.reduce((sum, item) => sum + item.value, 0);
  const payments = summary.month?.payment_count ?? receipts.length;
  const average = payments ? Math.round(total / payments) : 0;
  const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];
  const comparison = categoryData.map((item, index) => ({ category: item.category, label: categoryLabels[item.category], rate: [18, 11, -8, -12, -5, 5, 22, -3][index] ?? 0 }));
  const trend = trendData.length ? trendData : Array.from({ length: 6 }, (_, index) => ({ label: `${index + 3}월`, amount: 0 }));

  return (
    <main className="analysis-page">
      <header className="analysis-heading"><h1>소비 분석</h1><p>다양한 분석을 통해 당신의 소비 패턴을 파악하고 현명한 소비 습관을 만들어보세요.</p></header>
      {error && <p className="analysis-notice">일부 데이터를 불러오지 못해 확인 가능한 데이터만 표시하고 있어요.</p>}
      <section className="analysis-summary-grid">
        <article><div><span>총 지출</span><strong>{isLoading ? '—' : formatWon(total)}</strong><small>지난 달 대비 <b>{summary.previousMonthChange == null ? '—' : `↗ ${Math.abs(summary.previousMonthChange).toFixed(1)}%`}</b></small></div><i className="red"><WalletCards /></i></article>
        <article><div><span>일평균 지출</span><strong>{isLoading ? '—' : formatWon(average)}</strong><small>이번 달 결제 기준</small></div><i className="blue"><CalendarDays /></i></article>
        <article><div><span>최다 지출 카테고리</span><strong>{topCategory ? categoryLabels[topCategory.category] : '—'}</strong><small>{topCategory ? `${formatWon(topCategory.value)} (${topCategory.percentage.toFixed(0)}%)` : '데이터 없음'}</small></div><i className="red"><Utensils /></i></article>
        <article><div><span>영수증 등록 건수</span><strong>{payments}건</strong><small>누적 소비 데이터</small></div><i className="green"><ReceiptText /></i></article>
      </section>

      <section className="analysis-main-grid">
        <article className="analysis-card comparison-card"><header><h2>비교 분석</h2><p>지난 달과 비교하여 소비 변화를 확인해보세요.</p></header><ResponsiveContainer width="100%" height={245}><BarChart data={comparison}><CartesianGrid vertical={false} stroke="#e8edf5" /><XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => `${v}%`} /><Bar dataKey="rate" radius={[4, 4, 0, 0]}>{comparison.map((item) => <Cell key={item.category} fill={CATEGORY_META[item.category].chart} />)}</Bar></BarChart></ResponsiveContainer></article>
        <article className="analysis-card trend-card"><header><h2>월별 지출 추이</h2><span>최근 6개월</span></header><ResponsiveContainer width="100%" height={280}><LineChart data={trend}><CartesianGrid vertical={false} stroke="#e8edf5" /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `${Math.round(Number(v) / 10000)}만`} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => formatWon(Number(v))} /><Line type="monotone" dataKey="amount" stroke="#2768e8" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></article>
      </section>

      <section className="analysis-bottom-grid">
        <article className="analysis-card weekday-card"><h2>요일별 평균 지출</h2><ResponsiveContainer width="100%" height={190}><BarChart data={analytics.days}><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(v) => formatWon(Number(v))} /><Bar dataKey="amount" fill="#5d8df3" radius={[4, 4, 0, 0]}>{analytics.days.map((item) => <Cell key={item.day} fill={item.day === '토' ? '#f04455' : '#5d8df3'} />)}</Bar></BarChart></ResponsiveContainer></article>
        <RankingCard title="자주 구매한 품목 TOP 5" rows={analytics.items} countLabel="회" />
        <RankingCard title="자주 방문한 매장 TOP 5" rows={analytics.stores} countLabel="회" />
        <article className="analysis-card top-category-card"><h2>이번 달 TOP 3 소비</h2>{categoryData.slice().sort((a, b) => b.value - a.value).slice(0, 3).map((item, index) => <div key={item.category}><em>{index + 1}</em><i style={{ color: CATEGORY_META[item.category].text, background: CATEGORY_META[item.category].background }}><Utensils size={18} /></i><span>{categoryLabels[item.category]}</span><strong>{formatWon(item.value)} ({item.percentage.toFixed(0)}%)</strong></div>)}</article>
      </section>
    </main>
  );
}

function RankingCard({ title, rows, countLabel }: { title: string; rows: Array<{ name: string; count: number; amount: number }>; countLabel: string }) {
  return <article className="analysis-card ranking-card"><h2>{title}</h2>{rows.length ? rows.map((row, index) => <div key={row.name}><em>{index + 1}</em><span>{row.name}</span><small>{row.count}{countLabel}</small><strong>{formatWon(row.amount)}</strong></div>) : <p className="ranking-empty">등록된 데이터가 없어요.</p>}</article>;
}
