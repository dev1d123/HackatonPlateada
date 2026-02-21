import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SearchResponse } from '@/lib/camera-api';

export type AhorraMedHistoryItem = {
  id: string;
  createdAt: number;
  kind: 'image' | 'text';
  imageUri?: string;
  text?: string;
};

const HISTORY_KEY = 'ahorramed:history:v1';

function resultKey(id: string) {
  return `ahorramed:result:v1:${id}`;
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadAhorraMedHistory(): Promise<AhorraMedHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown>(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((x: any) => x && typeof x.id === 'string' && typeof x.createdAt === 'number' && (x.kind === 'image' || x.kind === 'text'))
    .map((x: any) => ({
      id: String(x.id),
      createdAt: Number(x.createdAt),
      kind: x.kind as 'image' | 'text',
      imageUri: typeof x.imageUri === 'string' ? x.imageUri : undefined,
      text: typeof x.text === 'string' ? x.text : undefined,
    }));
}

export async function saveAhorraMedHistory(items: AhorraMedHistoryItem[]) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export async function upsertAhorraMedHistoryItem(item: AhorraMedHistoryItem) {
  const prev = await loadAhorraMedHistory();
  const without = prev.filter((h) => h.id !== item.id);
  await saveAhorraMedHistory([item, ...without]);
}

export async function deleteAhorraMedHistoryItem(id: string) {
  const prev = await loadAhorraMedHistory();
  await saveAhorraMedHistory(prev.filter((h) => h.id !== id));
  await AsyncStorage.removeItem(resultKey(id));
}

export async function saveAhorraMedHistoryResult(historyId: string, result: SearchResponse) {
  await AsyncStorage.setItem(resultKey(historyId), JSON.stringify(result));
}

export async function loadAhorraMedHistoryResult(historyId: string): Promise<SearchResponse | null> {
  const raw = await AsyncStorage.getItem(resultKey(historyId));
  if (!raw) return null;
  const parsed = safeParseJson<SearchResponse>(raw);
  if (!parsed || !Array.isArray((parsed as any).results)) return null;
  return parsed;
}
