import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BusFront, CalendarDays, ChevronDown, Coffee, Ellipsis, Hospital, ReceiptText, ShoppingBag, ShoppingBasket, Sparkles, Theater, Utensils, WalletCards } from 'lucide-react';
import { CATEGORY_META, normalizeCategory } from '../constants/categories';
import { SpendingTrendChart } from '../features/dashboard/SpendingTrendChart';
import { useDashboardCharts } from '../hooks/useDashboardCharts';
import { getReceipts } from '../services/receiptApi';
import type { ReceiptResponse } from '../types/api';
import type { ExpenseCategory } from '../types/expense';

const categoryLabels: Record<ExpenseCategory, string> = { food: '식비', cafe: '카페·간식', shopping: '쇼핑', transport: '교통', living: '생활·생필품', medical: '의료·건강', culture: '문화·여가', other: '기타' };
const categoryIcons = { food: Utensils, cafe: Coffee, shopping: ShoppingBag, transport: BusFront, living: ShoppingBasket, medical: Hospital, culture: Theater, other: Ellipsis };
const categoryOrder = Object.keys(categoryLabels) as ExpenseCategory[];
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const displayWeekdays = ['월', '화', '수', '목', '금', '토', '일'];

function formatWon(value: number) { return `₩${Math.round(value).toLocaleString('ko-KR')}`; }
export function AnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const current = new Date();
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
  });
  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const current = new Date();
    const target = new Date(current.getFullYear(), current.getMonth() - index, 1);
    const value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: `${target.getFullYear()}년 ${target.getMonth() + 1}월` };
  });
  const { categoryData, summary, isLoading, error } = useDashboardCharts(selectedMonth);
  const [receipts, setReceipts] = useState<ReceiptResponse[]>([]);
  const [trendMode, setTrendMode] = useState<'total' | 'category'>('total');

  const monthReceipts = useMemo(() => receipts.filter((receipt) => receipt.date.startsWith(selectedMonth)), [receipts, selectedMonth]);

  useEffect(() => {
    const controller = new AbortController();
    getReceipts(controller.signal).then((data) => setReceipts(Array.isArray(data) ? data : data.items)).catch(() => setReceipts([]));
    return () => controller.abort();
  }, []);

  const analytics = useMemo(() => {
    const items = new Map<string, { count: number; amount: number }>();
    const stores = new Map<string, { count: number; amount: number }>();
    const daily = new Map<string, { total: number; dates: Set<string> }>();
    monthReceipts.forEach((receipt) => {
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
  }, [monthReceipts]);

  const trendMonths = useMemo(() => {
    const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
    const months = Array.from({ length: 6 }, (_, index) => {
      const target = new Date(selectedYear, selectedMonthNumber - 1 - (5 - index), 1);
      const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: `${target.getMonth() + 1}월` };
    });
    return months;
  }, [selectedMonth]);

  const trend = useMemo(() => trendMonths.map(({ key, label }) => ({
    label,
    amount: receipts
      .filter((receipt) => receipt.date.startsWith(key))
      .reduce((sum, receipt) => sum + Number(receipt.total_amount), 0),
  })), [receipts, trendMonths]);

  const categoryTrend = useMemo(() => {
    const rows = trendMonths.map(({ key, label }) => ({ key, label, ...Object.fromEntries(categoryOrder.map((category) => [category, 0])) })) as Array<Record<ExpenseCategory, number> & { key: string; label: string }>;
    const rowMap = new Map(rows.map((row) => [row.key, row]));
    receipts.forEach((receipt) => {
      const row = rowMap.get(receipt.date.slice(0, 7));
      if (!row) return;
      receipt.items.forEach((item) => {
        const category = normalizeCategory(item.category);
        row[category] += Number(item.price);
      });
    });
    return rows;
  }, [receipts, trendMonths]);

  const total = summary.month?.total_spent ?? categoryData.reduce((sum, item) => sum + item.value, 0);
  const payments = summary.month?.payment_count ?? monthReceipts.length;
  const average = payments ? Math.round(total / payments) : 0;
  const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];
  const TopCategoryIcon = topCategory ? categoryIcons[topCategory.category] : Utensils;
  const highestDay = analytics.days.reduce((highest, day) => day.amount > highest.amount ? day : highest, { day: '', amount: 0 });
  const comparison = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const previousDate = new Date(year, month - 2, 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    const totalsFor = (targetMonth: string) => {
      const totals = new Map<ExpenseCategory, number>();
      receipts.filter((receipt) => receipt.date.startsWith(targetMonth)).forEach((receipt) => receipt.items.forEach((item) => {
        const category = normalizeCategory(item.category);
        totals.set(category, (totals.get(category) ?? 0) + Number(item.price));
      }));
      return totals;
    };
    const current = totalsFor(selectedMonth);
    const previous = totalsFor(previousMonth);
    return categoryOrder.map((category) => {
      const currentAmount = current.get(category) ?? 0;
      const previousAmount = previous.get(category) ?? 0;
      const rate = previousAmount === 0 ? (currentAmount > 0 ? 100 : 0) : ((currentAmount - previousAmount) / previousAmount) * 100;
      return { category, label: categoryLabels[category], rate: Number(rate.toFixed(1)) };
    });
  }, [receipts, selectedMonth]);
  return (
    <main className="analysis-page">
      <header className="analysis-heading"><div><h1>소비 분석</h1><p>다양한 분석을 통해 당신의 소비 패턴을 파악하고 현명한 소비 습관을 만들어보세요.</p></div><label className="month-select"><select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="분석 월 선택">{monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={18} /></label></header>
      {error && <p className="analysis-notice">일부 데이터를 불러오지 못해 확인 가능한 데이터만 표시하고 있어요.</p>}
      <section className="analysis-summary-grid">
        <article><div><span>총 지출</span><strong>{isLoading ? '—' : formatWon(total)}</strong><small>지난 달 대비 <b>{summary.previousMonthChange == null ? '—' : `↗ ${Math.abs(summary.previousMonthChange).toFixed(1)}%`}</b></small></div><i className="red"><WalletCards /></i></article>
        <article><div><span>일평균 지출</span><strong>{isLoading ? '—' : formatWon(average)}</strong><small>이번 달 결제 기준</small></div><i className="blue"><CalendarDays /></i></article>
        <article><div><span>최다 지출 카테고리</span><strong>{topCategory ? categoryLabels[topCategory.category] : '—'}</strong><small>{topCategory ? `${formatWon(topCategory.value)} (${topCategory.percentage.toFixed(0)}%)` : '데이터 없음'}</small></div><i style={topCategory ? { color: CATEGORY_META[topCategory.category].text, background: CATEGORY_META[topCategory.category].background } : undefined}><TopCategoryIcon /></i></article>
        <article><div><span>영수증 등록 건수</span><strong>{payments}건</strong><small>누적 소비 데이터</small></div><i className="green"><ReceiptText /></i></article>
      </section>

      <section className="analysis-main-grid">
        <article className="analysis-card comparison-card"><header><h2>비교 분석</h2><p>지난 달과 비교하여 소비 변화를 확인해보세요.</p></header><ResponsiveContainer width="100%" height={245}><BarChart data={comparison}><CartesianGrid vertical={false} stroke="#e8edf5" /><XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => `${v}%`} /><Bar dataKey="rate" radius={[4, 4, 0, 0]}>{comparison.map((item) => <Cell key={item.category} fill={CATEGORY_META[item.category].chart} />)}</Bar></BarChart></ResponsiveContainer></article>
        <article className="analysis-card trend-card"><header><h2>월별 지출 추이</h2><div className="trend-mode-toggle"><button type="button" className={trendMode === 'total' ? 'active' : ''} onClick={() => setTrendMode('total')}>총 금액</button><button type="button" className={trendMode === 'category' ? 'active' : ''} onClick={() => setTrendMode('category')}>카테고리</button></div></header>{trendMode === 'total' ? <SpendingTrendChart data={trend} /> : <div className="category-trend-wrap"><ResponsiveContainer width="100%" height={270}><LineChart data={categoryTrend} margin={{ top: 20, right: 18, left: 12, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8edf5" /><XAxis dataKey="label" axisLine={false} tickLine={false} padding={{ left: 18, right: 18 }} /><YAxis width={72} axisLine={false} tickLine={false} tickMargin={12} tickFormatter={(value) => `₩${Number(value).toLocaleString('ko-KR')}`} /><Tooltip formatter={(value) => formatWon(Number(value))} />{categoryOrder.map((category) => <Line key={category} type="linear" dataKey={category} name={categoryLabels[category]} stroke={CATEGORY_META[category].chart} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}</LineChart></ResponsiveContainer><ul className="category-trend-legend">{categoryOrder.map((category) => <li key={category}><i style={{ background: CATEGORY_META[category].chart }} />{categoryLabels[category]}</li>)}</ul></div>}</article>
      </section>

      <section className="analysis-bottom-grid">
        <article className="analysis-card weekday-card"><h2>요일별 평균 지출</h2><span className="weekday-unit">(원)</span><ResponsiveContainer width="100%" height={220}><BarChart data={analytics.days} margin={{ top: 28, right: 2, left: 2, bottom: 0 }}><CartesianGrid vertical={false} stroke="#dfe7f2" strokeDasharray="4 4" /><XAxis dataKey="day" axisLine={{ stroke: '#cad5e5' }} tickLine={false} /><YAxis hide /><Tooltip formatter={(v) => formatWon(Number(v))} /><Bar dataKey="amount" fill="#5d8df3" radius={[7, 7, 0, 0]} maxBarSize={34}><LabelList dataKey="amount" position="top" formatter={(value: unknown) => `${Number(value).toLocaleString('ko-KR')}원`} />{analytics.days.map((item) => <Cell key={item.day} fill={highestDay.amount > 0 && item.day === highestDay.day ? '#f04455' : '#5d8df3'} />)}</Bar></BarChart></ResponsiveContainer><div className="weekday-insight"><Sparkles size={17} />{highestDay.amount > 0 ? `${highestDay.day}요일의 지출이 가장 많아요!` : '요일별 소비 데이터가 아직 없어요.'}</div></article>
        <RankingCard title="자주 구매한 품목 TOP 5" rows={analytics.items} countLabel="회" />
        <RankingCard title="자주 방문한 매장 TOP 5" rows={analytics.stores} countLabel="회" />
        <article className="analysis-card top-category-card"><h2>이번 달 TOP 3 소비</h2>{categoryData.slice().sort((a, b) => b.value - a.value).slice(0, 3).map((item, index) => { const Icon = categoryIcons[item.category]; return <div key={item.category}><em>{index + 1}</em><i style={{ color: CATEGORY_META[item.category].text, background: CATEGORY_META[item.category].background }}><Icon size={18} /></i><span>{categoryLabels[item.category]}</span><strong>{formatWon(item.value)} ({item.percentage.toFixed(0)}%)</strong></div>; })}</article>
      </section>
    </main>
  );
}

function RankingCard({ title, rows, countLabel }: { title: string; rows: Array<{ name: string; count: number; amount: number }>; countLabel: string }) {
  return <article className="analysis-card ranking-card"><h2>{title}</h2>{rows.length ? rows.map((row, index) => <div key={row.name}><em>{index + 1}</em><span>{row.name}</span><small>{row.count}{countLabel}</small><strong>{formatWon(row.amount)}</strong></div>) : <p className="ranking-empty">등록된 데이터가 없어요.</p>}</article>;
}
