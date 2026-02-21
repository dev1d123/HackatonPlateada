import type { SearchResponse } from '@/lib/camera-api';

const results = new Map<string, SearchResponse>();

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function putAhorraMedResult(result: SearchResponse) {
  const id = makeId();
  results.set(id, result);
  return id;
}

export function getAhorraMedResult(id: string) {
  return results.get(id) ?? null;
}

export function removeAhorraMedResult(id: string) {
  results.delete(id);
}

export function takeAhorraMedResult(id: string) {
  const result = results.get(id) ?? null;
  results.delete(id);
  return result;
}
