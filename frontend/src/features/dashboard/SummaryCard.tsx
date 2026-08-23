import type { LucideIcon } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { formatWon } from '../../utils/currency';

interface Props {
  label: string;
  amount: number | null;
  detail: string;
  icon: LucideIcon;
  tone: 'green' | 'blue' | 'orange' | 'red';
  percentage?: boolean;
}

export function SummaryCard({ label, amount, detail, icon: Icon, tone, percentage }: Props) {
  const displayAmount = amount === null
    ? '—'
    : percentage
      ? `${amount >= 0 ? '↗' : '↘'} ${Math.abs(amount).toFixed(1)}%`
      : formatWon(amount);

  return (
    <Card className="summary-card">
      <div>
        <p className="eyebrow">{label}</p>
        <strong className={tone === 'red' ? 'danger' : ''}>{displayAmount}</strong>
        <p>{detail}</p>
      </div>
      <span className={`summary-icon ${tone}`}><Icon size={28} /></span>
    </Card>
  );
}
