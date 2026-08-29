import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { CATEGORIES, normalizeCategory } from '../constants/categories';
import { deleteReceipt, getReceipts } from '../services/receiptApi';
import type { ReceiptResponse } from '../types/api';
import type { ExpenseCategory } from '../types/expense';
import { formatWon } from '../utils/currency';

const PAGE_SIZE = 7;

function getMonthRange() {
  const lastRegisteredDate = sessionStorage.getItem('spendly:lastRegisteredDate');
  if (lastRegisteredDate && /^\d{4}-\d{2}-\d{2}$/.test(lastRegisteredDate)) {
    sessionStorage.removeItem('spendly:lastRegisteredDate');
    const [year, month] = lastRegisteredDate.split('-').map(Number);
    const end = new Date(year, month, 0).getDate();
    return { start: `${year}-${String(month).padStart(2, '0')}-01`, end: `${year}-${String(month).padStart(2, '0')}-${String(end).padStart(2, '0')}` };
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const format = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  return { start: format(new Date(year, month, 1)), end: format(new Date(year, month + 1, 0)) };
}

function getReceiptCategory(receipt: ReceiptResponse): ExpenseCategory {
  if (receipt.main_category) return normalizeCategory(receipt.main_category);
  const categoryTotals = new Map<ExpenseCategory, number>();
  receipt.items.forEach((item) => {
    const category = normalizeCategory(item.category);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + Number(item.price));
  });
  return [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

function formatReceiptDate(receipt: ReceiptResponse) {
  return receipt.date;
}

export function ExpensesPage() {
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const [initialRange] = useState(() => getMonthRange());
  const [receipts, setReceipts] = useState<ReceiptResponse[]>([]);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadReceipts() {
      try {
        const response = await getReceipts(controller.signal);
        setReceipts(Array.isArray(response) ? response : response.items);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(requestError instanceof Error ? requestError.message : '소비 내역을 불러오지 못했습니다.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadReceipts();
    return () => controller.abort();
  }, []);

  const filteredReceipts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const receiptCategory = getReceiptCategory(receipt);
      const matchesDate = (!startDate || receipt.date >= startDate) && (!endDate || receipt.date <= endDate);
      const matchesCategory = category === 'all' || receiptCategory === category;
      const matchesQuery = !normalizedQuery
        || receipt.store_name.toLowerCase().includes(normalizedQuery)
        || receipt.items.some((item) => item.name.toLowerCase().includes(normalizedQuery));
      return matchesDate && matchesCategory && matchesQuery;
    }).sort((a, b) => `${b.date}${b.created_at}`.localeCompare(`${a.date}${a.created_at}`));
  }, [receipts, startDate, endDate, category, query]);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageReceipts = filteredReceipts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visiblePages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    const start = Math.min(Math.max(currentPage - 2, 1), Math.max(totalPages - 4, 1));
    return start + index;
  });

  function exportCsv() {
    const header = ['날짜', '상호명', '카테고리', '품목 수', '금액'];
    const rows = filteredReceipts.map((receipt) => [
      `="${formatReceiptDate(receipt)}"`, receipt.store_name,
      CATEGORIES.find((item) => item.id === getReceiptCategory(receipt))?.label ?? '기타',
      String(receipt.items.length), String(receipt.total_amount),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `spendly-expenses-${startDate}-${endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(receipt: ReceiptResponse) {
    if (!window.confirm(`${receipt.store_name} 내역을 삭제할까요? 삭제한 내역은 복구할 수 없습니다.`)) return;
    setDeletingId(receipt.id);
    setError(null);
    try {
      await deleteReceipt(receipt.id);
      setReceipts((current) => current.filter((item) => item.id !== receipt.id));
      setExpandedId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '소비 내역을 삭제하지 못했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="expenses-page">
      <section className="expenses-panel">
        <header className="expenses-heading">
          <div><h1>소비 내역</h1></div>
          <button type="button" onClick={exportCsv} disabled={filteredReceipts.length === 0}>내보내기 <Download size={18} /></button>
        </header>

        <div className="expense-filters">
          <div className="date-range-filter">
            <div className="date-input-control">
              <input ref={startDateRef} aria-label="조회 시작일" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} />
              <button type="button" aria-label="시작일 선택" onClick={() => startDateRef.current?.showPicker()}><CalendarDays size={19} /></button>
            </div>
            <span>~</span>
            <div className="date-input-control">
              <input ref={endDateRef} aria-label="조회 종료일" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} />
              <button type="button" aria-label="종료일 선택" onClick={() => endDateRef.current?.showPicker()}><CalendarDays size={19} /></button>
            </div>
          </div>
          <label className="category-filter">
            <select value={category} onChange={(event) => { setCategory(event.target.value as 'all' | ExpenseCategory); setPage(1); }}>
              <option value="all">전체 카테고리</option>
              {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <ChevronDown size={19} />
          </label>
          <label className="expense-search"><Search size={20} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="상호명 또는 품목 검색" /></label>
        </div>

        {error && <p className="expenses-status error" role="alert">{error}</p>}
        <div className="expenses-table-wrap">
          <table className="expenses-table">
            <thead><tr><th>날짜</th><th>상호명</th><th>카테고리</th><th>품목 수</th><th>금액</th><th><span className="sr-only">상세</span></th></tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="expenses-status">소비 내역을 불러오는 중입니다.</td></tr>
              ) : pageReceipts.length === 0 ? (
                <tr><td colSpan={6} className="expenses-status">조건에 맞는 소비 내역이 없습니다.</td></tr>
              ) : pageReceipts.map((receipt) => {
                const receiptCategory = getReceiptCategory(receipt);
                const expanded = expandedId === receipt.id;
                return (
                  <tr className="expense-row-group" key={receipt.id}>
                    <td colSpan={6}>
                      <button className="expense-row" type="button" onClick={() => setExpandedId(expanded ? null : receipt.id)}>
                        <time>{formatReceiptDate(receipt)}</time><strong>{receipt.store_name}</strong><span><CategoryBadge category={receiptCategory} /></span><span>{receipt.items.length}개</span><b>{formatWon(Number(receipt.total_amount))}</b><ChevronRight className={expanded ? 'expanded' : ''} size={21} />
                      </button>
                      {expanded && <div className="expense-row-detail"><div className="expense-detail-items">{receipt.items.map((item, index) => <div key={`${item.name}-${index}`}><span>{item.name}</span><CategoryBadge category={normalizeCategory(item.category)} /><strong>{formatWon(Number(item.price))}</strong></div>)}</div><button className="expense-delete-button" type="button" disabled={deletingId === receipt.id} onClick={() => void handleDelete(receipt)}><Trash2 size={17} />{deletingId === receipt.id ? '삭제 중...' : '내역 삭제'}</button></div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && <nav className="expenses-pagination" aria-label="소비 내역 페이지">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={19} /></button>
          {visiblePages.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === currentPage ? 'active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          {totalPages > 5 && visiblePages.at(-1) !== totalPages && <><span>…</span><button type="button" onClick={() => setPage(totalPages)}>{totalPages}</button></>}
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={19} /></button>
        </nav>}
      </section>
    </div>
  );
}
