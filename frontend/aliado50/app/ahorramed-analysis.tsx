import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { LocationsMap } from '@/components/locations-map';
import { LocationPoint } from '@/components/locations-map.types';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const analysisMock = require('../mocks/ahorramed-analysis.json') as AhorraMedAnalysisMock;

type MockStock = 'disponible' | 'bajo' | 'agotado';

type MockLocation = LocationPoint & {
  stock: MockStock;
};

type MedicamentoMock = {
  id: string;
  inn: string;
  presentacion: string;
  marca: string;
  forma: string;
  empaque: string;
  advertencias: string[];
  ubicaciones: MockLocation[];
};

type AhorraMedAnalysisMock = {
  generatedAt: string;
  medicamentos: MedicamentoMock[];
  informacionAdicional: {
    doctor: string;
    hospital: string;
    observaciones: string;
  };
};

function openGoogleMaps(lat: number, lng: number) {
  // Keep it coordinates-only to avoid Google Maps parsing quirks.
  const url = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
  Linking.openURL(url).catch(() => {});
}

function stockLabel(stock: MockStock) {
  if (stock === 'disponible') return 'Stock disponible';
  if (stock === 'bajo') return 'Stock bajo';
  return 'Sin stock';
}

function distanceLabel(meters: number) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
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

          <View style={styles.modalContent}>{children}</View>

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

  const params = useLocalSearchParams<{ imageUri?: string }>();
  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;

  const [mapForMed, setMapForMed] = useState<MedicamentoMock | null>(null);
  const [infoForMed, setInfoForMed] = useState<MedicamentoMock | null>(null);
  const [warnForMed, setWarnForMed] = useState<MedicamentoMock | null>(null);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

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

  const medicamentos = analysisMock.medicamentos ?? [];
  const info = analysisMock.informacionAdicional;

  const selectedLocation = useMemo(() => {
    const locs: MockLocation[] = mapForMed?.ubicaciones ?? [];
    if (!locs.length) return null;
    const found = selectedLocationId ? locs.find((l) => l.id === selectedLocationId) : null;
    return found ?? locs[0];
  }, [mapForMed, selectedLocationId]);

  const openMapFor = useCallback((med: MedicamentoMock) => {
    setSelectedLocationId(med.ubicaciones?.[0]?.id ?? null);
    setMapForMed(med);
  }, []);

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
            Análisis de la foto
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: divider }]} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {imageUri ? (
            <View style={[styles.photoCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Image source={{ uri: imageUri }} contentFit="cover" style={styles.photo} transition={140} />
              <View style={styles.photoOverlay}>
                <ThemedText type="defaultSemiBold">Resultado (demo)</ThemedText>
                <ThemedText style={{ opacity: 0.78 }}>Medicamentos y ubicaciones simuladas</ThemedText>
              </View>
            </View>
          ) : null}

          <SectionCard title="Medicamentos encontrados" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.medsList}>
              {medicamentos.map((med) => (
                <View key={med.id} style={[styles.medRow, { borderColor: withAlpha(colors.text, 0.12) }]}>
                  <View style={styles.medLeft}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                      {med.inn}
                    </ThemedText>
                    <ThemedText style={{ opacity: 0.76 }}>
                      INN
                    </ThemedText>
                  </View>

                  <View style={styles.medActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Abrir mapa"
                      onPress={() => openMapFor(med)}
                      style={({ pressed, hovered }) => [
                        styles.iconPill,
                        { backgroundColor: withAlpha(colors.tint, 0.16), borderColor: withAlpha(colors.tint, 0.28) },
                        pressed ? { opacity: 0.9 } : null,
                        hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                      ]}
                    >
                      <IconSymbol name="map.fill" size={16} color={colors.tint} />
                      <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                        Mapa
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Más información"
                      onPress={() => setInfoForMed(med)}
                      style={({ pressed, hovered }) => [
                        styles.iconCircle,
                        { backgroundColor: withAlpha('#000000', 0.08), borderColor: withAlpha(colors.text, 0.14) },
                        pressed ? { opacity: 0.9 } : null,
                        hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                      ]}
                    >
                      <IconSymbol name="info.circle" size={18} color={withAlpha(colors.text, 0.86)} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Advertencias"
                      onPress={() => setWarnForMed(med)}
                      style={({ pressed, hovered }) => [
                        styles.iconCircle,
                        { backgroundColor: withAlpha('#000000', 0.08), borderColor: withAlpha(colors.text, 0.14) },
                        pressed ? { opacity: 0.9 } : null,
                        hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                      ]}
                    >
                      <IconSymbol name="exclamationmark.triangle.fill" size={18} color={withAlpha(colors.text, 0.86)} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {medicamentos.length === 0 ? (
                <ThemedText style={{ opacity: 0.8 }}>
                  No se detectaron medicamentos (demo).
                </ThemedText>
              ) : null}
            </View>
          </SectionCard>

          <SectionCard title="Información adicional" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.infoGrid}>
              <View style={[styles.infoChip, { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.28) }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>Doctor</ThemedText>
                <ThemedText style={{ opacity: 0.88 }}>{info?.doctor ?? '—'}</ThemedText>
              </View>

              <View style={[styles.infoChip, { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.28) }]}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>Hospital</ThemedText>
                <ThemedText style={{ opacity: 0.88 }}>{info?.hospital ?? '—'}</ThemedText>
              </View>

              <View style={[styles.infoChipWide, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
                <ThemedText type="defaultSemiBold">Observaciones</ThemedText>
                <ThemedText style={{ opacity: 0.82 }}>{info?.observaciones ?? '—'}</ThemedText>
              </View>
            </View>
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

        <SheetModal
          visible={!!mapForMed}
          title={mapForMed ? `Mapa · ${mapForMed.inn}` : 'Mapa'}
          onClose={() => setMapForMed(null)}
          cardBg={cardBg}
          borderColor={border}
          textColor={colors.text}
          tint={colors.tint}
        >
          {mapForMed ? (
            <View style={{ gap: 12 }}>
              <ThemedText style={{ opacity: 0.82 }}>
                Toca una ubicación para ver detalles.
              </ThemedText>

              <LocationsMap
                locations={mapForMed.ubicaciones}
                selectedId={selectedLocation?.id ?? null}
                onSelect={setSelectedLocationId}
              />

              {selectedLocation ? (
                <View style={[styles.locDetail, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
                  <ThemedText type="defaultSemiBold">
                    {selectedLocation.nombre}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.86 }}>
                    📍 A {distanceLabel(selectedLocation.distanciaMetros)} – {selectedLocation.direccion}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.86 }}>
                    🕒 Abierta hasta {selectedLocation.cierraA}
                  </ThemedText>

                  <View style={styles.locMetaRow}>
                    <ThemedText type="defaultSemiBold">
                      💲 {selectedLocation.precio.toFixed(2)} {selectedLocation.moneda}
                    </ThemedText>
                    <ThemedText style={{ opacity: 0.86 }}>
                      📦 {stockLabel(selectedLocation.stock)}
                    </ThemedText>
                  </View>

                  <ThemedText style={{ opacity: 0.78 }}>
                    ⏱ Actualizado hace {selectedLocation.actualizadoHaceMin} min
                  </ThemedText>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openGoogleMaps(selectedLocation.lat, selectedLocation.lng)}
                    style={({ pressed, hovered }) => [
                      styles.openBtn,
                      { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.35) },
                      pressed ? { opacity: 0.9 } : null,
                      hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                      Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                    ]}
                  >
                    <IconSymbol name="mappin.and.ellipse" size={16} color={colors.tint} />
                    <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                      Seleccionar ubicación
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </SheetModal>

        <SheetModal
          visible={!!infoForMed}
          title={infoForMed ? `Información · ${infoForMed.inn}` : 'Información'}
          onClose={() => setInfoForMed(null)}
          cardBg={cardBg}
          borderColor={border}
          textColor={colors.text}
          tint={colors.tint}
        >
          {infoForMed ? (
            <View style={{ gap: 10 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                {infoForMed.inn} {infoForMed.presentacion} – {infoForMed.marca}
              </ThemedText>
              <ThemedText style={{ opacity: 0.84 }}>
                {infoForMed.forma} | {infoForMed.empaque}
              </ThemedText>
              <ThemedText style={{ opacity: 0.78 }}>
                (Modo demo) Datos de presentación simulados.
              </ThemedText>
            </View>
          ) : null}
        </SheetModal>

        <SheetModal
          visible={!!warnForMed}
          title={warnForMed ? `Advertencias · ${warnForMed.inn}` : 'Advertencias'}
          onClose={() => setWarnForMed(null)}
          cardBg={cardBg}
          borderColor={border}
          textColor={colors.text}
          tint={colors.tint}
        >
          {warnForMed ? (
            <View style={{ gap: 8 }}>
              {(warnForMed.advertencias ?? []).map((w, idx) => (
                <View key={`${warnForMed.id}-w-${idx}`} style={styles.warnRow}>
                  <ThemedText style={{ opacity: 0.9 }}>• {w}</ThemedText>
                </View>
              ))}
              {(!warnForMed.advertencias || warnForMed.advertencias.length === 0) ? (
                <ThemedText style={{ opacity: 0.8 }}>
                  No hay advertencias disponibles.
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </SheetModal>
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
  medRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  medLeft: {
    flex: 1,
    gap: 2,
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
    paddingBottom: 14,
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
});
