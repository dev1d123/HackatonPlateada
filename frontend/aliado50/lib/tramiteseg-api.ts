export const TRAMITESEG_API_BASE_URL = 'https://law-copilot-backend-537825049720.us-central1.run.app';

export type TramiteSegSourceHierarchy = {
  title?: string;
  chapter?: string;
  section?: string;
};

export type TramiteSegSource = {
  id?: string;
  source?: string;
  label?: string;
  text?: string;
  hierarchy?: TramiteSegSourceHierarchy;
  similarity_score?: number;
};

export type TramiteSegRewriteInfo = {
  tema_legal?: string;
  conceptos_clave?: string[];
  queries_optimizadas?: string[];
  leyes_relevantes?: string[];
};

export type TramiteSegQueryRequest = {
  query: string;
  top_k?: number;
  score_threshold?: number;
};

export type TramiteSegQueryResponse = {
  answer?: string;
  sources?: TramiteSegSource[];
  query?: string;
  total_sources_found?: number;
  rewrite_info?: TramiteSegRewriteInfo;
};

async function readErrorMessage(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as any;
      if (typeof data?.detail === 'string') return data.detail;
      if (Array.isArray(data?.detail) && data.detail[0]?.msg) return String(data.detail[0].msg);
      if (typeof data?.message === 'string') return data.message;
      return JSON.stringify(data);
    }

    const text = await res.text();
    return text || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function queryLegalAssistant(args: TramiteSegQueryRequest) {
  const payload: TramiteSegQueryRequest = {
    query: args.query,
    top_k: typeof args.top_k === 'number' ? args.top_k : 5,
    score_threshold: typeof args.score_threshold === 'number' ? args.score_threshold : 0.3,
  };

  const res = await fetch(`${TRAMITESEG_API_BASE_URL}/api/v1/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as TramiteSegQueryResponse;
}