export type LocationPoint = {
  id: string;
  nombre: string;
  distanciaMetros: number;
  direccion: string;
  cierraA: string;
  precio: number;
  moneda: string;
  stock: 'disponible' | 'bajo' | 'agotado';
  actualizadoHaceMin: number;
  lat: number;
  lng: number;
};
