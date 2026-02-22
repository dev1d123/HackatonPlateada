import type { TramiteSegQueryResponse } from '@/lib/tramiteseg-api';

const results = new Map<string, TramiteSegQueryResponse>();

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function putTramiteSegResult(result: TramiteSegQueryResponse) {
  const id = makeId();
  results.set(id, result);
  return id;
}

export function getTramiteSegResult(id: string) {
  return results.get(id) ?? null;
}

export function removeTramiteSegResult(id: string) {
  results.delete(id);
}

export function takeTramiteSegResult(id: string) {
  const result = results.get(id) ?? null;
  results.delete(id);
  return result;
}