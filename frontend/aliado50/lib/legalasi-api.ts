export const LEGALASI_API_BASE_URL = 'https://camera-doc-assistant.vercel.app';

export type LegalSourceHierarchy = {
  title?: string;
  chapter?: string;
  section?: string;
};

export type LegalSource = {
  id?: string;
  source?: string;
  label?: string;
  text?: string;
  hierarchy?: LegalSourceHierarchy;
  similarity_score?: number;
};

export type LegalRewriteInfo = {
  tema_legal?: string;
  conceptos_clave?: string[];
  queries_optimizadas?: string[];
  leyes_relevantes?: string[];
};

export type LegalCopilotResponse = {
  answer?: string;
  sources?: LegalSource[];
  query?: string;
  total_sources_found?: number;
  rewrite_info?: LegalRewriteInfo;
};

export type LegalAnalyzeResponse = {
  type?: string;
  explanation?: string;
  extracted_text?: string;
  legal_copilot_response?: LegalCopilotResponse;
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

function guessMimeTypeFromUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function guessFileNameFromUri(uri: string) {
  const cleaned = uri.split('?')[0];
  const parts = cleaned.split('/');
  const last = parts[parts.length - 1];
  if (last && last.includes('.')) return last;
  const ext = guessMimeTypeFromUri(uri).split('/')[1] || 'jpg';
  return `documento.${ext}`;
}

function normalizeType(type: string) {
  if (type.includes('png')) return 'image/png';
  if (type.includes('webp')) return 'image/webp';
  if (type.includes('gif')) return 'image/gif';
  if (type.includes('heic')) return 'image/heic';
  return 'image/jpeg';
}

function toDataUrlBase64(input: string, mimeType?: string) {
  if (input.startsWith('data:image/')) return input;
  const safeType = normalizeType((mimeType ?? 'image/png').toLowerCase());
  return `data:${safeType};base64,${input}`;
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error('No se pudo procesar la imagen del PDF.');
  }
  const mimeType = match[1] || 'image/png';
  const b64 = match[2];
  const decodeBase64 = (globalThis as any)?.atob as ((value: string) => string) | undefined;
  if (!decodeBase64) {
    throw new Error('El entorno actual no soporta conversión base64 para PDF.');
  }
  const binary = decodeBase64(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function analyzeLegalDocumentFromImage(args: {
  imageUri?: string;
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const formData = new FormData();

  if (args.imageBase64) {
    const dataUrl = toDataUrlBase64(args.imageBase64, args.imageMimeType);
    const blob = dataUrlToBlob(dataUrl);
    formData.append('file', blob as any, 'documento.png');
  } else if (args.imageUri) {
    const file: any = {
      uri: args.imageUri,
      name: guessFileNameFromUri(args.imageUri),
      type: guessMimeTypeFromUri(args.imageUri),
    };
    formData.append('file', file);
  } else {
    throw new Error('No se encontró imagen para analizar.');
  }

  const res = await fetch(`${LEGALASI_API_BASE_URL}/api/v1/gemini/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as LegalAnalyzeResponse;
}