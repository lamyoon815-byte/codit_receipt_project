import type { CategoryMeta, ExpenseCategory } from '../types/expense';

export type BackendCategory = 'FOOD' | 'CAFE' | 'DAILY' | 'SHOPPING' | 'TRANSPORT' | 'HEALTH' | 'CULTURE' | 'ETC';

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  food: { label: '식비', chart: '#F05A5A', background: '#FDECEC', text: '#C73D3D' },
  cafe: { label: '카페·간식', chart: '#F59E42', background: '#FFF4E5', text: '#D97706' },
  shopping: { label: '쇼핑', chart: '#E8B931', background: '#FFF8E1', text: '#B58B00' },
  transport: { label: '교통', chart: '#35A873', background: '#E6F6EE', text: '#207A56' },
  living: { label: '생활·생필품', chart: '#4285E8', background: '#EAF1FD', text: '#2B5CC5' },
  medical: { label: '의료·건강', chart: '#5367C7', background: '#ECEEFF', text: '#3E4EA1' },
  culture: { label: '문화·여가', chart: '#8B62D9', background: '#F3ECFF', text: '#6A42C1' },
  other: { label: '기타', chart: '#8A96A8', background: '#F1F3F6', text: '#5F6B7A' },
};

export const CATEGORY_API_CODE: Record<ExpenseCategory, BackendCategory> = {
  food: 'FOOD', cafe: 'CAFE', living: 'DAILY', shopping: 'SHOPPING',
  transport: 'TRANSPORT', medical: 'HEALTH', culture: 'CULTURE', other: 'ETC',
};

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  FOOD: 'food', 식비: 'food',
  CAFE: 'cafe', '카페·간식': 'cafe', '카페ㆍ간식': 'cafe',
  DAILY: 'living', '생활·생필품': 'living', '생활ㆍ생필품': 'living',
  SHOPPING: 'shopping', 쇼핑: 'shopping',
  TRANSPORT: 'transport', 교통: 'transport',
  HEALTH: 'medical', '의료·건강': 'medical', '의료ㆍ건강': 'medical',
  CULTURE: 'culture', '문화·여가': 'culture', '문화ㆍ여가': 'culture',
  ETC: 'other', 기타: 'other',
};

export function normalizeCategory(category: string): ExpenseCategory {
  return CATEGORY_ALIASES[category.trim()] ?? 'other';
}

export const CATEGORIES = Object.entries(CATEGORY_META).map(([id, meta]) => ({
  id: id as ExpenseCategory,
  apiCode: CATEGORY_API_CODE[id as ExpenseCategory],
  ...meta,
}));
