import type { LegalAnalyzeResponse } from '@/lib/legalasi-api';

const results = new Map<string, LegalAnalyzeResponse>();

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function putLegalAsiResult(result: LegalAnalyzeResponse) {
  const id = makeId();
  results.set(id, result);
  return id;
}

export function getLegalAsiResult(id: string) {
  return results.get(id) ?? null;
}

export function removeLegalAsiResult(id: string) {
  results.delete(id);
}

export function takeLegalAsiResult(id: string) {
  const result = results.get(id) ?? null;
  results.delete(id);
  return result;
}