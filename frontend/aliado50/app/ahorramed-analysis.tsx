import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { LocationsMap } from '@/components/locations-map';
import { LocationPoint } from '@/components/locations-map.types';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { MedicationResponse, SearchResponse, UbicacionRecomendacion, UbicacionesRecomendadas } from '@/lib/camera-api';
import { loadAhorraMedHistoryResult } from '@/lib/ahorramed-history-store';
import { getAhorraMedResult, putAhorraMedResult } from '@/lib/ahorramed-result-store';

type MockStock = 'disponible' | 'bajo' | 'agotado';

type MockLocation = LocationPoint & {
  stock: MockStock;
  tipoRecomendacion: string;
  telefono?: string | null;
  urlMaps?: string | null;
  tipo?: string | null;
  titular?: string | null;
  fabricante?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
};

type MedicamentoMock = {
  id: string;
  nom_ifa: string;
  nom_prod: string;
  concentracion: string;
  forma_farmaceutica: string;
  macro_categoria: string;
  advertencias: string[];
  ubicaciones: MockLocation[];
  raw: MedicationResponse;
};

function buildWarningsFromMedication(med: MedicationResponse) {
  const warnings: string[] = [];
  const desc = med.descripcion;
  const contra = desc?.contraindicaciones ?? null;
  if (Array.isArray(contra)) warnings.push(...contra.filter((x) => typeof x === 'string' && x.trim()));
  const adv = desc?.advertencia_si_pasa_esto;
  if (typeof adv === 'string' && adv.trim()) warnings.push(adv.trim());
  return warnings;
}

function toMockStock(totalDisponibles?: number) {
  if (typeof totalDisponibles === 'number' && totalDisponibles <= 0) return 'agotado' as const;
  return 'disponible' as const;
}

function recToLocation(rec: UbicacionRecomendacion, stock: MockStock, idx: number): MockLocation | null {
  const f = rec.farmacia;
  const lat = f?.latitud;
  const lng = f?.longitud;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const precio = typeof f?.precio === 'number' && Number.isFinite(f.precio) ? f.precio : 0;
  const nombre = `${f?.establecimiento ?? 'Farmacia'} (${recLabel(rec.tipo_recomendacion)})`;
  const direccion = f?.direccion ?? '';
  const distanciaKm = typeof rec.distancia_km === 'number' && Number.isFinite(rec.distancia_km) ? rec.distancia_km : null;

  return {
    id: `${rec.tipo_recomendacion}-${idx}-${String(f?.establecimiento ?? 'farmacia')}`,
    nombre,
    distanciaMetros: distanciaKm ? Math.round(distanciaKm * 1000) : 0,
    direccion,
    cierraA: '',
    precio,
    moneda: 'S/',
    stock,
    actualizadoHaceMin: 0,
    lat: Number(lat),
    lng: Number(lng),
    tipoRecomendacion: rec.tipo_recomendacion,
    telefono: f?.telefono ?? null,
    urlMaps: f?.url_maps ?? null,
    tipo: f?.tipo ?? null,
    titular: f?.titular ?? null,
    fabricante: f?.fabricante ?? null,
    departamento: f?.departamento ?? null,
    provincia: f?.provincia ?? null,
    distrito: f?.distrito ?? null,
  };
}

function buildLocations(ubic: UbicacionesRecomendadas | null | undefined): MockLocation[] {
  if (!ubic) return [];
  const stock = toMockStock(ubic.total_disponibles);
  const locs: MockLocation[] = [];

  const candidates = [ubic.mas_barata, ubic.mas_cercana, ubic.mas_equilibrada].filter(Boolean) as UbicacionRecomendacion[];
  candidates.forEach((rec, idx) => {
    const loc = recToLocation(rec, stock, idx);
    if (loc) locs.push(loc);
  });

  return locs;
}

function openGoogleMaps(lat: number, lng: number) {
  // Keep it coordinates-only to avoid Google Maps parsing quirks.
  const url = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
  Linking.openURL(url).catch(() => {});
}

function openUrl(url?: string | null) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function recLabel(tipo: string) {
  if (tipo === 'mas_barata') return 'Más barata';
  if (tipo === 'mas_cercana') return 'Más cercana';
  if (tipo === 'mas_equilibrada') return 'Más equilibrada';
  return tipo;
}

function stockLabel(stock: MockStock) {
  if (stock === 'disponible') return 'Stock disponible';
  if (stock === 'bajo') return 'Stock bajo';
  return 'Sin stock';
}

function distanceLabel(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function FieldBlock({
  icon,
  title,
  children,
  tint,
  textColor,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  children: ReactNode;
  tint: string;
  textColor: string;
}) {
  return (
    <View
      style={[
        styles.fieldBlock,
        { borderColor: withAlpha(textColor, 0.12), backgroundColor: withAlpha('#000000', 0.04) },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View
          style={[
            styles.fieldIcon,
            {
              backgroundColor: withAlpha(tint, 0.14),
              borderColor: withAlpha(tint, 0.28),
            },
          ]}
        >
          <IconSymbol name={icon} size={16} color={tint} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.fieldTitle}>
          {title}
        </ThemedText>
      </View>
      <View style={styles.fieldBody}>{children}</View>
    </View>
  );
}

function BulletList({ items, textColor }: { items: (string | null | undefined)[]; textColor: string }) {
  const safe = (items ?? []).filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  if (!safe.length) {
    return <ThemedText style={{ opacity: 0.78 }}>No disponible.</ThemedText>;
  }
  return (
    <View style={styles.bulletList}>
      {safe.map((t, idx) => (
        <View key={`${idx}-${t.slice(0, 12)}`} style={styles.bulletRow}>
          <IconSymbol name="chevron.right" size={16} color={withAlpha(textColor, 0.55)} />
          <ThemedText style={{ opacity: 0.9, flex: 1 }}>{t}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function SectionCard({
  title,
  children,
  backgroundColor,
  borderColor,
}: {
  title: string;
  children: ReactNode;
  backgroundColor: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor, borderColor }]}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SheetModal({
  visible,
  title,
  onClose,
  children,
  cardBg,
  borderColor,
  textColor,
  tint,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  cardBg: string;
  borderColor: string;
  textColor: string;
  tint: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropPress} onPress={onClose} />

        <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
        >
          <View style={styles.modalHeader}>
            <ThemedText type="defaultSemiBold" style={{ color: withAlpha(textColor, 0.92), fontSize: 16 }}>
              {title}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={({ pressed, hovered }) => [
                styles.modalClose,
                { backgroundColor: withAlpha('#000000', 0.12), borderColor: withAlpha(textColor, 0.14) },
                pressed ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.95 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <IconSymbol name="xmark" size={18} color={withAlpha(textColor, 0.9)} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed, hovered }) => [
                styles.modalDone,
                { backgroundColor: withAlpha(tint, 0.18), borderColor: withAlpha(tint, 0.32) },
                pressed ? { opacity: 0.9 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: tint }}>
                Listo
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AhorraMedAnalysisScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const params = useLocalSearchParams<{ resultId?: string; historyId?: string; imageUri?: string; text?: string }>();
  const resultId = typeof params.resultId === 'string' ? params.resultId : null;
  const historyId = typeof params.historyId === 'string' ? params.historyId : null;
  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;
  const textQuery = typeof params.text === 'string' ? params.text : null;

  const [response, setResponse] = useState<SearchResponse | null>(null);

  const cardBg = useMemo(
    () => withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
    [colors.background, colorScheme]
  );

  const border = useMemo(() => withAlpha(colors.text, 0.16), [colors.text]);
  const divider = useMemo(
    () => withAlpha(colors.text, colorScheme === 'dark' ? 0.18 : 0.14),
    [colors.text, colorScheme]
  );

  const onBack = useCallback(() => {
    if (typeof (router as any).canGoBack === 'function') {
      const can = (router as any).canGoBack();
      if (can) {
        router.back();
        return;
      }
    }
    router.replace('/ahorramed');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, [resultId, historyId]);

  const medicamentos = useMemo((): MedicamentoMock[] => {
    const results = response?.results ?? [];
          return results.map((r, idx) => {
      const med = r.medicamento;
      const advertencias = buildWarningsFromMedication(r);
      const ubicaciones = buildLocations(r.ubicaciones_recomendadas);
      const nom_prod = med?.nom_prod ?? 'Medicamento';
      const nom_ifa = med?.nom_ifa ?? '—';
      const concentracion = med?.concentracion ?? '—';
      const forma_farmaceutica = med?.forma_farmaceutica ?? '—';
      const macro_categoria = med?.macro_categoria ?? '—';
      return {
        id: `${idx}-${String(med?.nom_prod ?? 'med')}-${String(med?.concentracion ?? '')}`,
        nom_ifa,
        nom_prod,
        concentracion,
        forma_farmaceutica,
        macro_categoria,
        advertencias,
        ubicaciones,
        raw: r,
      };
    });
  }, [response]);

  const openDetailFor = useCallback(
    (medIndex: number) => {
      const rid = response ? putAhorraMedResult(response) : null;
      router.push({
        pathname: '/ahorramed-med-detail',
        params: {
          medIndex: String(medIndex),
          historyId: historyId ?? undefined,
          resultId: rid ?? undefined,
          imageUri: imageUri ?? undefined,
          text: textQuery ?? undefined,
        },
      });
    },
    [response, historyId, imageUri, textQuery]
  );

  const onPlanCompras = useCallback(() => {
    Alert.alert('Plan de compras', 'Selecciona una opción (en implementación):', [
      {
        text: 'Más cercano',
        onPress: () => Alert.alert('En implementación', 'Esta opción estará disponible pronto.'),
      },
      {
        text: 'Más barato',
        onPress: () => {
          Alert.alert('Más barato', 'Selecciona un rango (en implementación):', [
            {
              text: '5 km',
              onPress: () => Alert.alert('En implementación', 'Esta opción estará disponible pronto.'),
            },
            {
              text: '10 km',
              onPress: () => Alert.alert('En implementación', 'Esta opción estará disponible pronto.'),
            },
            {
              text: '100 km',
              onPress: () => Alert.alert('En implementación', 'Esta opción estará disponible pronto.'),
            },
            { text: 'Cancelar', style: 'cancel' },
          ]);
        },
      },
      {
        text: 'Personalizado',
        onPress: () => Alert.alert('En implementación', 'Esta opción estará disponible pronto.'),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, []);

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
            {textQuery ? 'Análisis de la consulta' : 'Análisis de la foto'}
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: divider }]} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {imageUri ? (
            <View style={[styles.photoCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Image source={{ uri: imageUri }} contentFit="cover" style={styles.photo} transition={140} />
              <View style={styles.photoOverlay}>
                <ThemedText type="defaultSemiBold">Resultado</ThemedText>
                <ThemedText style={{ opacity: 0.78 }}>
                  {response?.feedback_message ?? 'Consulta procesada'}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {textQuery ? (
            <View style={[styles.queryChip, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
              <ThemedText type="defaultSemiBold">Búsqueda</ThemedText>
              <ThemedText style={{ opacity: 0.82 }} numberOfLines={2}>
                {textQuery}
              </ThemedText>
            </View>
          ) : null}

          <SectionCard title="Medicamentos encontrados" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.medsMetaRow}>
              <ThemedText style={{ opacity: 0.78 }}>
                {medicamentos.length} {medicamentos.length === 1 ? 'medicamento' : 'medicamentos'}
              </ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>
                Resumen
              </ThemedText>
            </View>
            <View style={styles.medsList}>
              {medicamentos.map((med, idx) => (
                <View key={med.id} style={[styles.medRow, { borderColor: withAlpha(colors.text, 0.12) }]}>
                  <View style={styles.medLeft}>
                    <ThemedText type="defaultSemiBold" style={styles.medTitle}>
                      {med.nom_prod}
                    </ThemedText>
                    <ThemedText style={{ opacity: 0.82 }} numberOfLines={2}>
                      {med.nom_ifa}
                    </ThemedText>
                    <View style={styles.chipsRow}>
                      <View
                        style={[
                          styles.chip,
                          { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.28) },
                        ]}
                      >
                        <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                          {med.concentracion}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.chip,
                          { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) },
                        ]}
                      >
                        <ThemedText type="defaultSemiBold" style={{ opacity: 0.92 }}>
                          {med.forma_farmaceutica}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.chip,
                          { backgroundColor: withAlpha(colors.tint, 0.10), borderColor: withAlpha(colors.tint, 0.22) },
                        ]}
                      >
                        <ThemedText type="defaultSemiBold" style={{ color: colors.tint, opacity: 0.95 }} numberOfLines={1}>
                          {med.macro_categoria}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver más"
                    onPress={() => openDetailFor(idx)}
                    style={({ pressed, hovered }) => [
                      styles.moreBtn,
                      { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.35) },
                      pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
                      hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                    ]}
                  >
                    <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                      Ver más
                    </ThemedText>
                    <IconSymbol name="chevron.right" size={18} color={colors.tint} />
                  </Pressable>
                </View>
              ))}

              {medicamentos.length === 0 ? (
                <ThemedText style={{ opacity: 0.8 }}>
                  No se detectaron medicamentos.
                </ThemedText>
              ) : null}
            </View>
          </SectionCard>

          <SectionCard title="Información" backgroundColor={cardBg} borderColor={border}>
            <ThemedText style={{ opacity: 0.84 }}>
              {response?.feedback_message ?? '—'}
            </ThemedText>
          </SectionCard>

          <SectionCard title="Plan de compras" backgroundColor={cardBg} borderColor={border}>
            <ThemedText style={{ opacity: 0.82 }}>
              Elige una estrategia para sugerir dónde comprar. (Aún en implementación)
            </ThemedText>

            <Pressable
              accessibilityRole="button"
              onPress={onPlanCompras}
              style={({ pressed, hovered }) => [
                styles.planBtn,
                { backgroundColor: withAlpha(colors.tint, 0.92), borderColor: withAlpha(colors.tint, 0.35) },
                pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: '#ffffff' }}>
                Seleccionar plan
              </ThemedText>
            </Pressable>
          </SectionCard>

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

  photoCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    height: 150,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.22)',
    gap: 2,
  },

  queryChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  sectionBody: {
    gap: 12,
  },

  medsList: {
    gap: 10,
  },
  medsMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  medRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  medLeft: {
    flex: 1,
    gap: 2,
  },
  moreBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  medActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoGrid: {
    gap: 10,
  },
  infoChip: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  infoChipWide: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },

  planBtn: {
    marginTop: 4,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 22,
    justifyContent: 'flex-end',
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    maxHeight: '84%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: 14,
  },
  modalContentInner: {
    paddingBottom: 14,
    gap: 12,
  },
  modalFooter: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  modalDone: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locDetail: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  locMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  locLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  warnRow: {
    paddingVertical: 2,
  },
  warnLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  medHeaderCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  fieldBlock: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTitle: {
    fontSize: 15,
    lineHeight: 19,
    opacity: 0.94,
  },
  fieldBody: {
    gap: 8,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
});
