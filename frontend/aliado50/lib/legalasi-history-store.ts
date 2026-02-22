import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LegalAnalyzeResponse } from '@/lib/legalasi-api';

export type LegalAsiHistoryItem = {
  id: string;
  createdAt: number;
  kind: 'image' | 'pdf';
  imageUri?: string;
  pdfUri?: string;
  fileName?: string;
};

const HISTORY_KEY = 'legalasi:history:v1';

function resultKey(id: string) {
  return `legalasi:result:v1:${id}`;
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadLegalAsiHistory(): Promise<LegalAsiHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  const parsed = safeParseJson<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((x: any) => x && typeof x.id === 'string' && typeof x.createdAt === 'number' && (x.kind === 'image' || x.kind === 'pdf'))
    .map((x: any) => ({
      id: String(x.id),
      createdAt: Number(x.createdAt),
      kind: x.kind as 'image' | 'pdf',
      imageUri: typeof x.imageUri === 'string' ? x.imageUri : undefined,
      pdfUri: typeof x.pdfUri === 'string' ? x.pdfUri : undefined,
      fileName: typeof x.fileName === 'string' ? x.fileName : undefined,
    }));
}

export async function saveLegalAsiHistory(items: LegalAsiHistoryItem[]) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export async function upsertLegalAsiHistoryItem(item: LegalAsiHistoryItem) {
  const prev = await loadLegalAsiHistory();
  const without = prev.filter((h) => h.id !== item.id);
  await saveLegalAsiHistory([item, ...without]);
}

export async function deleteLegalAsiHistoryItem(id: string) {
  const prev = await loadLegalAsiHistory();
  await saveLegalAsiHistory(prev.filter((h) => h.id !== id));
  await AsyncStorage.removeItem(resultKey(id));
}

export async function saveLegalAsiHistoryResult(historyId: string, result: LegalAnalyzeResponse) {
  await AsyncStorage.setItem(resultKey(historyId), JSON.stringify(result));
}

export async function loadLegalAsiHistoryResult(historyId: string): Promise<LegalAnalyzeResponse | null> {
  const raw = await AsyncStorage.getItem(resultKey(historyId));
  if (!raw) return null;

  const parsed = safeParseJson<LegalAnalyzeResponse>(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed;
}