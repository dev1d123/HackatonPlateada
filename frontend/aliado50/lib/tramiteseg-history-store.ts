import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TramiteSegQueryResponse } from '@/lib/tramiteseg-api';

export type TramiteSegHistoryItem = {
  id: string;
  createdAt: number;
  query: string;
};

const HISTORY_KEY = 'tramiteseg:history:v1';

function resultKey(id: string) {
  return `tramiteseg:result:v1:${id}`;
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadTramiteSegHistory(): Promise<TramiteSegHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  const parsed = safeParseJson<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (x: any) =>
        x &&
        typeof x.id === 'string' &&
        typeof x.createdAt === 'number' &&
        typeof x.query === 'string'
    )
    .map((x: any) => ({
      id: String(x.id),
      createdAt: Number(x.createdAt),
      query: String(x.query),
    }));
}

export async function saveTramiteSegHistory(items: TramiteSegHistoryItem[]) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export async function upsertTramiteSegHistoryItem(item: TramiteSegHistoryItem) {
  const prev = await loadTramiteSegHistory();
  const without = prev.filter((h) => h.id !== item.id);
  await saveTramiteSegHistory([item, ...without]);
}

export async function deleteTramiteSegHistoryItem(id: string) {
  const prev = await loadTramiteSegHistory();
  await saveTramiteSegHistory(prev.filter((h) => h.id !== id));
  await AsyncStorage.removeItem(resultKey(id));
}

export async function saveTramiteSegHistoryResult(historyId: string, result: TramiteSegQueryResponse) {
  await AsyncStorage.setItem(resultKey(historyId), JSON.stringify(result));
}

export async function loadTramiteSegHistoryResult(historyId: string): Promise<TramiteSegQueryResponse | null> {
  const raw = await AsyncStorage.getItem(resultKey(historyId));
  if (!raw) return null;

  const parsed = safeParseJson<TramiteSegQueryResponse>(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed;
}