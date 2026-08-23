import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, BarChart3, Bus, ChevronDown, Coffee, CreditCard, Film, ShoppingBag, TrendingDown, Utensils } from 'lucide-react';
import { getAIReport } from '../services/receiptApi';
import type { AIReportResponse } from '../types/api';

const insightIcons = [ArrowUp, Coffee, TrendingDown, BarChart3];
const insightTones = ['red', 'orange', 'green', 'blue'];
const fallbackInsights = [
  ['식비 지출이 지난 달보다 24% 증가했어요.', '외식 지출이 18% 증가했어요.'],
  ['카페·간식 지출이 지난 달보다 11% 증가했어요.', '주로 오후 시간대에 지출이 많았어요.'],
  ['교통비는 지난 달보다 8% 절약했어요.', '대중교통 이용 비율이 높아졌어요.'],
  ['주말 지출이 평일보다 32% 많아요.', '주말 소비 패턴을 확인해보세요.'],
];
const savingItems = [
  { icon: Coffee, tone: 'orange', title: '카페·간식', description: '주 2회 이상 카페 이용을 줄이면\n월 평균 30,000원을 절약할 수 있어요.', amount: 30000 },
  { icon: Bus, tone: 'green', title: '택시·대중교통', description: '택시 이용을 줄이고 대중교통을 이용하면\n월 평균 15,000원을 절약할 수 있어요.', amount: 15000 },
  { icon: ShoppingBag, tone: 'purple', title: '쇼핑', description: '충동 구매를 줄이면 월 평균 20,000원을\n절약할 수 있어요.', amount: 20000 },
  { icon: Utensils, tone: 'blue', title: '식비(외식)', description: '외식 횟수를 주 1회 줄이면\n월 평균 25,000원을 절약할 수 있어요.', amount: 25000 },
  { icon: Film, tone: 'pink', title: '문화·여가', description: '구독 서비스와 여가 지출을 조정하면\n월 평균 10,000원을 절약할 수 있어요.', amount: 10000 },
  { icon: CreditCard, tone: 'cyan', title: '불필요한 소액 결제', description: '소액 결제 내역을 점검하면\n월 평균 5,000원을 절약할 수 있어요.', amount: 5000 },
];

export function InsightsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<AIReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => 12 - index), []);
  const monthParam = `${year}-${String(selectedMonth).padStart(2, '0')}`;

  useEffect(() => {
    const controller = new AbortController();
    getAIReport(monthParam, controller.signal).then(setReport).catch(() => setReport(null)).finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [monthParam]);

  const insights = report
    ? [[report.summary, report.highlights[0] ?? report.advice], ...report.highlights.slice(1, 3).map((text) => [text, report.advice]), [report.advice, `${selectedMonth}월 소비 습관을 바탕으로 분석했어요.`]].slice(0, 4)
    : fallbackInsights;

  return (
    <main className="insights-page">
      <div className="insights-page-heading">
        <div><h1>소비 인사이트</h1><p>AI 분석으로 발견한 당신의 소비 습관과 맞춤 인사이트를 확인해보세요.</p></div>
        <label className="month-select">
          <select value={selectedMonth} onChange={(event) => { setIsLoading(true); setSelectedMonth(Number(event.target.value)); }} aria-label="분석 월 선택">
            {monthOptions.map((month) => <option key={month} value={month}>{month}월</option>)}
          </select>
          <ChevronDown size={18} />
        </label>
      </div>
      <div className="insights-page-grid">
        <section className="insight-panel monthly-insights">
          <h2>이번 달 소비 인사이트</h2>
          {isLoading ? <div className="insight-loading">AI 소비 데이터를 분석하고 있어요.</div> : insights.map(([title, description], index) => {
            const Icon = insightIcons[index] ?? BarChart3;
            return <article className="monthly-insight-row" key={`${title}-${index}`}><span className={`insight-icon ${insightTones[index]}`}><Icon size={28} /></span><div><strong>{title}</strong><p>{description}</p></div></article>;
          })}
        </section>
        <section className="insight-panel saving-insights">
          <header><h2>절약할 수 있는 항목</h2><p>AI가 분석한 절약 가능 항목이에요.</p></header>
          <div>{savingItems.map(({ icon: Icon, tone, title, description, amount }) => <article className="saving-row" key={title}><span className={`insight-icon ${tone}`}><Icon size={26} /></span><div className="saving-copy"><strong>{title}</strong><p>{description}</p></div><div className="saving-amount"><span>월 예상 절약금</span><strong>₩{amount.toLocaleString('ko-KR')}</strong></div></article>)}</div>
        </section>
      </div>
    </main>
  );
}
