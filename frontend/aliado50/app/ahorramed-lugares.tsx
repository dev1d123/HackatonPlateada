import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { LocationsMap } from '@/components/locations-map';
import type { LocationPoint } from '@/components/locations-map.types';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { SearchResponse, UbicacionDetalle, UbicacionRecomendacion, UbicacionesRecomendadas } from '@/lib/camera-api';
import { loadAhorraMedHistoryResult } from '@/lib/ahorramed-history-store';
import { getAhorraMedResult } from '@/lib/ahorramed-result-store';

type RecCard = {
  key: 'mas_barata' | 'mas_cercana' | 'mas_equilibrada';
  title: string;
  rec: UbicacionRecomendacion | null;
  ubic: UbicacionesRecomendadas | null;
};

function recLabel(tipo: string) {
  if (tipo === 'mas_barata') return 'Más barata';
  if (tipo === 'mas_cercana') return 'Más cercana';
  if (tipo === 'mas_equilibrada') return 'Más equilibrada';
  return tipo;
}

function toMeters(distanciaKm?: number | null) {
  if (typeof distanciaKm !== 'number' || !Number.isFinite(distanciaKm) || distanciaKm <= 0) return 0;
  return Math.round(distanciaKm * 1000);
}

function openGoogleMapsRoute(lat: number, lng: number) {
  // Route to destination.
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`;
  Linking.openURL(url).catch(() => {});
}

function openUrl(url?: string | null) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function stockFromTotal(totalDisponibles?: number) {
  if (typeof totalDisponibles === 'number' && totalDisponibles <= 0) return 'agotado' as const;
  return 'disponible' as const;
}

function locationPointFromRec(args: {
  rec: UbicacionRecomendacion;
  totalDisponibles?: number;
  idx: number;
}): { point: LocationPoint; farmacia: UbicacionDetalle } | null {
  const f = args.rec.farmacia;
  const lat = f?.latitud;
  const lng = f?.longitud;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const point: LocationPoint = {
    id: `${args.rec.tipo_recomendacion}-${args.idx}-${String(f?.establecimiento ?? 'farmacia')}`,
    nombre: String(f?.establecimiento ?? 'Farmacia'),
    distanciaMetros: toMeters(args.rec.distancia_km ?? null),
    direccion: String(f?.direccion ?? '—'),
    cierraA: '',
    precio: typeof f?.precio === 'number' && Number.isFinite(f.precio) ? f.precio : 0,
    moneda: 'S/',
    stock: stockFromTotal(args.totalDisponibles),
    actualizadoHaceMin: 0,
    lat: Number(lat),
    lng: Number(lng),
  };

  return { point, farmacia: f };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText style={{ opacity: 0.75, width: 120 }}>{label}</ThemedText>
      <ThemedText style={{ opacity: 0.92, flex: 1 }}>{value}</ThemedText>
    </View>
  );
}

export default function AhorraMedLugaresScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const params = useLocalSearchParams<{
    resultId?: string;
    historyId?: string;
    imageUri?: string;
    text?: string;
    medIndex?: string;
  }>();

  const resultId = typeof params.resultId === 'string' ? params.resultId : null;
  const historyId = typeof params.historyId === 'string' ? params.historyId : null;
  const medIndex = typeof params.medIndex === 'string' ? Number.parseInt(params.medIndex, 10) : NaN;

  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [selectedByKey, setSelectedByKey] = useState<Record<string, string | null>>({
    mas_barata: null,
    mas_cercana: null,
    mas_equilibrada: null,
  });

  const cardBg = useMemo(
    () => withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
    [colors.background, colorScheme]
  );

  const border = useMemo(() => withAlpha(colors.text, 0.16), [colors.text]);
  const divider = useMemo(
    () => withAlpha(colors.text, colorScheme === 'dark' ? 0.18 : 0.14),
    [colors.text, colorScheme]
  );

  const goResults = useCallback(() => {
    router.replace({
      pathname: '/ahorramed-analysis',
      params: {
        historyId: historyId ?? undefined,
        resultId: resultId ?? undefined,
      },
    });
  }, [historyId, resultId]);

  const goMedDetail = useCallback(() => {
    if (typeof (router as any).canGoBack === 'function') {
      const can = (router as any).canGoBack();
      if (can) {
        router.back();
        return;
      }
    }

    router.replace({
      pathname: '/ahorramed-med-detail',
      params: {
        historyId: historyId ?? undefined,
        resultId: resultId ?? undefined,
        medIndex: String(medIndex),
      },
    });
  }, [historyId, resultId, medIndex]);

  const onBack = useCallback(() => {
    goMedDetail();
  }, [goMedDetail]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(medIndex) || medIndex < 0) {
        Alert.alert('Vista no disponible', 'Selecciona un medicamento válido.');
        goMedDetail();
        return;
      }

      if (resultId) {
        const r = getAhorraMedResult(resultId);
        if (r) {
          if (!cancelled) setResponse(r);
          return;
        }
      }

      if (historyId) {
        try {
          const stored = await loadAhorraMedHistoryResult(historyId);
          if (stored) {
            if (!cancelled) setResponse(stored);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (cancelled) return;
      Alert.alert('Consulta no disponible', 'Vuelve a realizar la búsqueda.');
      router.replace('/ahorramed');
    })();

    return () => {
      cancelled = true;
    };
  }, [resultId, historyId, medIndex, goMedDetail]);

  const viewModel = useMemo(() => {
    const results = response?.results ?? [];
    const r = results[medIndex];
    if (!r) return null;

    const medName = r.medicamento?.nom_prod ?? 'Medicamento';
    const ubic = (r.ubicaciones_recomendadas ?? null) as UbicacionesRecomendadas | null;

    const cards: RecCard[] = [
      { key: 'mas_barata', title: 'Más barata', rec: ubic?.mas_barata ?? null, ubic },
      { key: 'mas_cercana', title: 'Más cercana', rec: ubic?.mas_cercana ?? null, ubic },
      { key: 'mas_equilibrada', title: 'Equilibrada', rec: ubic?.mas_equilibrada ?? null, ubic },
    ];

    return { medName, cards };
  }, [response, medIndex]);

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1580281657527-47f249e8f0a7?auto=format&fit=crop&w=1600&q=75"
      particleCount={12}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            style={({ pressed, hovered }) => [
              styles.iconButton,
              { backgroundColor: cardBg, borderColor: border },
              pressed ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
              hovered && Platform.OS === 'web' ? { opacity: 0.94 } : null,
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
            ]}
          >
            <IconSymbol name="chevron.left" size={20} color={withAlpha(colors.text, 0.9)} />
          </Pressable>

          <ThemedText type="title" style={styles.topTitle}>
            Lugares de compra
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: divider }]} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.breadcrumbRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a AhorraMed"
              onPress={() => router.replace('/ahorramed')}
              style={({ pressed, hovered }) => [
                styles.breadcrumbBtn,
                pressed ? { opacity: 0.85 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.92 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText style={{ opacity: 0.78 }}>AhorraMed</ThemedText>
            </Pressable>
            <IconSymbol name="chevron.right" size={16} color={withAlpha(colors.text, 0.45)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a resultados"
              onPress={goResults}
              style={({ pressed, hovered }) => [
                styles.breadcrumbBtn,
                pressed ? { opacity: 0.85 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.92 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText style={{ opacity: 0.78 }}>Resultados</ThemedText>
            </Pressable>
            <IconSymbol name="chevron.right" size={16} color={withAlpha(colors.text, 0.45)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al detalle"
              onPress={goMedDetail}
              style={({ pressed, hovered }) => [
                styles.breadcrumbBtn,
                pressed ? { opacity: 0.85 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.92 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText style={{ opacity: 0.78 }}>Detalle</ThemedText>
            </Pressable>
            <IconSymbol name="chevron.right" size={16} color={withAlpha(colors.text, 0.45)} />
            <ThemedText style={{ opacity: 0.92, flex: 1 }} numberOfLines={1}>
              {viewModel?.medName ?? '—'}
            </ThemedText>
            <IconSymbol name="chevron.right" size={16} color={withAlpha(colors.text, 0.45)} />
            <ThemedText style={{ opacity: 0.78 }}>Lugares de compra</ThemedText>
          </View>

          {viewModel ? (
            <View style={{ gap: 12 }}>
              {viewModel.cards.map((card, idx) => {
                if (!card.rec) {
                  return (
                    <View key={card.key} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
                      <ThemedText type="defaultSemiBold">{card.title}</ThemedText>
                      <ThemedText style={{ opacity: 0.78 }}>No hay recomendación disponible.</ThemedText>
                    </View>
                  );
                }

                const built = locationPointFromRec({
                  rec: card.rec,
                  totalDisponibles: card.ubic?.total_disponibles,
                  idx,
                });

                if (!built) {
                  return (
                    <View key={card.key} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
                      <ThemedText type="defaultSemiBold">{card.title}</ThemedText>
                      <ThemedText style={{ opacity: 0.78 }}>
                        La recomendación no tiene coordenadas (lat/lng).
                      </ThemedText>
                    </View>
                  );
                }

                const point = built.point;
                const farm = built.farmacia;

                const selectedId = selectedByKey[card.key] ?? point.id;

                return (
                  <View key={card.key} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
                    <View style={styles.sectionHeaderRow}>
                      <ThemedText type="defaultSemiBold">{card.title}</ThemedText>
                      <View style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.12), borderColor: withAlpha(colors.tint, 0.28) }]}>
                        <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                          {recLabel(card.rec!.tipo_recomendacion)}
                        </ThemedText>
                      </View>
                    </View>

                    <LocationsMap
                      locations={[point]}
                      selectedId={selectedId}
                      onSelect={(id) => setSelectedByKey((prev) => ({ ...prev, [card.key]: id }))}
                    />

                    <View style={[styles.infoCard, { backgroundColor: withAlpha('#000000', 0.04), borderColor: withAlpha(colors.text, 0.12) }]}>
                      <InfoRow label="Total disponibles" value={typeof card.ubic?.total_disponibles === 'number' ? String(card.ubic.total_disponibles) : '—'} />
                      <InfoRow label="Establecimiento" value={String(farm.establecimiento ?? '—')} />
                      <InfoRow label="Dirección" value={String(farm.direccion ?? '—')} />
                      <InfoRow label="Departamento" value={String(farm.departamento ?? '—')} />
                      <InfoRow label="Provincia" value={String(farm.provincia ?? '—')} />
                      <InfoRow label="Distrito" value={String(farm.distrito ?? '—')} />
                      <InfoRow label="Teléfono" value={String(farm.telefono ?? '—')} />
                      <InfoRow label="Tipo" value={String(farm.tipo ?? '—')} />
                      <InfoRow label="Titular" value={String(farm.titular ?? '—')} />
                      <InfoRow label="Fabricante" value={String(farm.fabricante ?? '—')} />
                      <InfoRow label="Precio" value={typeof farm.precio === 'number' && Number.isFinite(farm.precio) ? `${farm.precio.toFixed(2)} S/` : '—'} />
                      <InfoRow label="Distancia" value={typeof card.rec!.distancia_km === 'number' && Number.isFinite(card.rec!.distancia_km) ? `${card.rec!.distancia_km.toFixed(2)} km` : '—'} />
                      <InfoRow label="Puntaje" value={typeof card.rec!.puntaje_equilibrio === 'number' && Number.isFinite(card.rec!.puntaje_equilibrio) ? String(card.rec!.puntaje_equilibrio) : '—'} />
                      <InfoRow label="Lat/Lng" value={`${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`} />
                      <InfoRow label="URL Maps" value={farm.url_maps ? String(farm.url_maps) : '—'} />

                      <View style={styles.btnRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => (farm.url_maps ? openUrl(farm.url_maps) : openGoogleMapsRoute(point.lat, point.lng))}
                          style={({ pressed, hovered }) => [
                            styles.routeBtn,
                            { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.35) },
                            pressed ? { opacity: 0.9 } : null,
                            hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                            Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                          ]}
                        >
                          <IconSymbol name="car.fill" size={16} color={colors.tint} />
                          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                            Ruta en Google Maps
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
              <ThemedText style={{ opacity: 0.82 }}>Cargando ubicaciones…</ThemedText>
            </View>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 24,
  },
  topSpacer: {
    width: 44,
    height: 44,
  },
  divider: {
    height: 1,
    borderRadius: 999,
    marginBottom: 14,
  },
  scroll: {
    gap: 12,
    paddingBottom: 8,
  },

  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumbBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  btnRow: {
    marginTop: 6,
  },
  routeBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
