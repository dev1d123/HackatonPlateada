export const CAMERA_API_BASE_URL = 'https://camera-50.vercel.app';

export type DescripcionMedica = {
  clase_terapeutica?: Record<string, unknown> | null;
  para_que_sirve?: string | null;
  instrucciones_de_uso?: string[] | null;
  cuidados_durante_tratamiento?: string[] | null;
  advertencia_si_pasa_esto?: string | null;
  contraindicaciones?: string[] | null;
  gestion_de_olvidos?: string | null;
  como_guardarlo?: string | null;
};

export type MedicamentoDB = {
  nom_prod: string;
  nom_ifa?: string | null;
  concentracion: string;
  forma_farmaceutica: string;
  macro_categoria?: string | null;
  texto_exacto_busqueda?: string | null;
};

export type UbicacionDetalle = {
  tipo?: string | null;
  titular?: string | null;
  fabricante?: string | null;
  establecimiento?: string | null;
  telefono?: string | null;
  precio?: number | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  direccion?: string | null;
  url_maps?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

export type UbicacionRecomendacion = {
  tipo_recomendacion: string;
  farmacia: UbicacionDetalle;
  distancia_km?: number | null;
  puntaje_equilibrio?: number | null;
};

export type UbicacionesRecomendadas = {
  mas_barata?: UbicacionRecomendacion | null;
  mas_cercana?: UbicacionRecomendacion | null;
  mas_equilibrada?: UbicacionRecomendacion | null;
  total_disponibles?: number;
};

export type MedicationResponse = {
  medicamento: MedicamentoDB;
  descripcion?: DescripcionMedica | null;
  ubicaciones_recomendadas?: UbicacionesRecomendadas | null;
};

export type SearchResponse = {
  results: MedicationResponse[];
  feedback_message?: string | null;
};

type Coords = { lat: number; lng: number };

function pickCoords(input?: Partial<Coords> | null) {
  const lat = input?.lat;
  const lng = input?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

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
  return `receta.${ext}`;
}

export async function searchMedicationsByText(args: { text: string; coords?: Partial<Coords> | null }) {
  const coords = pickCoords(args.coords);

  const body = {
    text: args.text,
    user_lat: coords ? coords.lat : null,
    user_lng: coords ? coords.lng : null,
  };

  const res = await fetch(`${CAMERA_API_BASE_URL}/api/v1/medications/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as SearchResponse;
}

export async function searchMedicationsByImageUpload(args: {
  imageUri: string;
  coords?: Partial<Coords> | null;
}) {
  const coords = pickCoords(args.coords);

  const formData = new FormData();

  const file: any = {
    uri: args.imageUri,
    name: guessFileNameFromUri(args.imageUri),
    type: guessMimeTypeFromUri(args.imageUri),
  };

  formData.append('image', file);

  if (coords) {
    formData.append('user_lat', String(coords.lat));
    formData.append('user_lng', String(coords.lng));
  }

  const res = await fetch(`${CAMERA_API_BASE_URL}/api/v1/medications/search/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as SearchResponse;
}
