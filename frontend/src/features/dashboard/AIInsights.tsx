import type { AIReportResponse } from '../../types/api';

export function AIInsights({ report, isLoading }: { report: AIReportResponse | null; isLoading: boolean }) {
  if (isLoading) return <div className="list-state">AI 소비 인사이트를 불러오는 중입니다.</div>;
  if (!report) return <div className="list-state">분석할 소비 데이터가 아직 없습니다.</div>;

  const insights = [report.summary, ...report.highlights, report.advice].filter(Boolean).slice(0, 3);
  return <>{insights.map((insight, index) => <p key={`${index}-${insight}`}>{index === 0 ? '✨' : '💡'} {insight}</p>)}</>;
}
