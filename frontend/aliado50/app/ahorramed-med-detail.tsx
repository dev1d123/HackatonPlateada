import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { MedicationResponse, SearchResponse } from '@/lib/camera-api';
import { loadAhorraMedHistoryResult } from '@/lib/ahorramed-history-store';
import { getAhorraMedResult } from '@/lib/ahorramed-result-store';

type MedicamentoViewModel = {
  nom_prod: string;
  nom_ifa: string;
  concentracion: string;
  forma_farmaceutica: string;
  macro_categoria: string;
  advertencias: string[];
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

function FieldBlock({
  icon,
  title,
  children,
  tint,
  textColor,
  surfaceColor,
  borderColor,
  iconBg,
  iconBorder,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  children: ReactNode;
  tint: string;
  textColor: string;
  surfaceColor?: string;
  borderColor?: string;
  iconBg?: string;
  iconBorder?: string;
}) {
  return (
    <View
      style={[
        styles.fieldBlock,
        {
          borderColor: borderColor ?? withAlpha(textColor, 0.12),
          backgroundColor: surfaceColor ?? withAlpha(textColor, 0.035),
        },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View
          style={[
            styles.fieldIcon,
            {
              backgroundColor: iconBg ?? withAlpha(tint, 0.14),
              borderColor: iconBorder ?? withAlpha(tint, 0.28),
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
        <View
          key={`${idx}-${t.slice(0, 12)}`}
          style={[
            styles.bulletRow,
            {
              borderColor: withAlpha(textColor, 0.14),
              backgroundColor: withAlpha(textColor, 0.05),
            },
          ]}
        >
          <IconSymbol name="chevron.right" size={16} color={withAlpha(textColor, 0.65)} />
          <ThemedText style={{ opacity: 0.9, flex: 1 }}>{t}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export default function AhorraMedMedicationDetailScreen() {
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
  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;
  const textQuery = typeof params.text === 'string' ? params.text : null;
  const medIndex = typeof params.medIndex === 'string' ? Number.parseInt(params.medIndex, 10) : NaN;

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

  const descCard = useMemo(() => {
    const neutralSurface = withAlpha(colors.text, colorScheme === 'dark' ? 0.08 : 0.035);
    const neutralBorder = withAlpha(colors.text, colorScheme === 'dark' ? 0.22 : 0.14);

    const softSurface = withAlpha(colors.text, colorScheme === 'dark' ? 0.06 : 0.028);
    const softBorder = withAlpha(colors.text, colorScheme === 'dark' ? 0.18 : 0.12);

    const tintSurface = withAlpha(colors.tint, colorScheme === 'dark' ? 0.12 : 0.09);
    const tintBorder = withAlpha(colors.tint, colorScheme === 'dark' ? 0.34 : 0.28);

    const tintSurfaceStrong = withAlpha(colors.tint, colorScheme === 'dark' ? 0.16 : 0.12);
    const tintBorderStrong = withAlpha(colors.tint, colorScheme === 'dark' ? 0.42 : 0.36);

    return {
      neutral: { surfaceColor: neutralSurface, borderColor: neutralBorder },
      soft: { surfaceColor: softSurface, borderColor: softBorder },
      tint: { surfaceColor: tintSurface, borderColor: tintBorder },
      tintStrong: { surfaceColor: tintSurfaceStrong, borderColor: tintBorderStrong },
    } as const;
  }, [colors.text, colors.tint, colorScheme]);

  const goResults = useCallback(() => {
    // Prefer going back, but ensure it works even on web refresh.
    if (typeof (router as any).canGoBack === 'function') {
      const can = (router as any).canGoBack();
      if (can) {
        router.back();
        return;
      }
    }

    router.replace({
      pathname: '/ahorramed-analysis',
      params: {
        historyId: historyId ?? undefined,
        resultId: resultId ?? undefined,
        imageUri: imageUri ?? undefined,
        text: textQuery ?? undefined,
      },
    });
  }, [historyId, resultId, imageUri, textQuery]);

  const onBack = useCallback(() => {
    goResults();
  }, [goResults]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(medIndex) || medIndex < 0) {
        Alert.alert('Detalle no disponible', 'Selecciona un medicamento válido.');
        goResults();
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
  }, [resultId, historyId, medIndex, goResults]);

  const med = useMemo((): MedicamentoViewModel | null => {
    const results = response?.results ?? [];
    const r = results[medIndex];
    if (!r) return null;

    const m = r.medicamento;
    const warnings = buildWarningsFromMedication(r);

    return {
      nom_prod: m?.nom_prod ?? 'Medicamento',
      nom_ifa: m?.nom_ifa ?? '—',
      concentracion: m?.concentracion ?? '—',
      forma_farmaceutica: m?.forma_farmaceutica ?? '—',
      macro_categoria: m?.macro_categoria ?? '—',
      advertencias: warnings,
      raw: r,
    };
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
            Detalle
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
              accessibilityLabel="Volver a resultados"
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
            <ThemedText style={{ opacity: 0.92, flex: 1 }} numberOfLines={1}>
              {med?.nom_prod ?? '—'}
            </ThemedText>
          </View>

          {imageUri ? (
            <View style={[styles.photoCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Image source={{ uri: imageUri }} contentFit="cover" style={styles.photo} transition={140} />
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

          {med ? (
            <>
              <View
                style={[
                  styles.medHeaderCard,
                  { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                  {med.nom_prod}
                </ThemedText>
                <ThemedText style={{ opacity: 0.82 }}>{med.nom_ifa}</ThemedText>
                <View style={styles.chipsRow}>
                  <View style={[styles.chip, { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.28) }]}>
                    <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                      {med.concentracion}
                    </ThemedText>
                  </View>
                  <View style={[styles.chip, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
                    <ThemedText type="defaultSemiBold" style={{ opacity: 0.92 }}>
                      {med.forma_farmaceutica}
                    </ThemedText>
                  </View>
                  <View style={[styles.chip, { backgroundColor: withAlpha(colors.tint, 0.10), borderColor: withAlpha(colors.tint, 0.22) }]}>
                    <ThemedText type="defaultSemiBold" style={{ color: colors.tint, opacity: 0.95 }} numberOfLines={1}>
                      {med.macro_categoria}
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Lugares de compra"
                  onPress={() => {
                    router.push({
                      pathname: '/ahorramed-lugares',
                      params: {
                        medIndex: String(medIndex),
                        historyId: historyId ?? undefined,
                        resultId: resultId ?? undefined,
                        imageUri: imageUri ?? undefined,
                        text: textQuery ?? undefined,
                      },
                    });
                  }}
                  style={({ pressed, hovered }) => [
                    styles.ctaBtn,
                    { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.35) },
                    pressed ? { opacity: 0.9 } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <IconSymbol name="mappin.and.ellipse" size={16} color={colors.tint} />
                  <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                    Lugares de compra
                  </ThemedText>
                </Pressable>
              </View>

              <View style={{ gap: 10 }}>
                <ThemedText type="defaultSemiBold" style={{ opacity: 0.92 }}>
                  Descripción
                </ThemedText>

                <ThemedText style={{ opacity: 0.76, lineHeight: 18 }}>
                  Resumen rápido de uso, cuidados y seguridad.
                </ThemedText>

                <FieldBlock
                  icon="info.circle"
                  title="Clase terapéutica"
                  tint={colors.tint}
                  textColor={colors.text}
                  {...descCard.tint}
                >
                  {(() => {
                    const ct = med.raw?.descripcion?.clase_terapeutica as any;
                    const titulo = typeof ct?.titulo === 'string' && ct.titulo.trim() ? ct.titulo.trim() : null;
                    const desc = typeof ct?.descripcion_sencilla === 'string' && ct.descripcion_sencilla.trim() ? ct.descripcion_sencilla.trim() : null;
                    if (!titulo && !desc) return <ThemedText style={{ opacity: 0.78 }}>No disponible.</ThemedText>;
                    return (
                      <View style={{ gap: 4 }}>
                        {titulo ? (
                          <ThemedText type="defaultSemiBold" style={{ opacity: 0.92 }}>
                            {titulo}
                          </ThemedText>
                        ) : null}
                        {desc ? <ThemedText style={{ opacity: 0.84 }}>{desc}</ThemedText> : null}
                      </View>
                    );
                  })()}
                </FieldBlock>

                <FieldBlock icon="heart.fill" title="Para qué sirve" tint={colors.tint} textColor={colors.text} {...descCard.neutral}>
                  {med.raw?.descripcion?.para_que_sirve ? (
                    <ThemedText style={{ opacity: 0.9 }}>{med.raw.descripcion.para_que_sirve}</ThemedText>
                  ) : (
                    <ThemedText style={{ opacity: 0.78 }}>No disponible.</ThemedText>
                  )}
                </FieldBlock>

                <FieldBlock
                  icon="chevron.right"
                  title="Instrucciones de uso"
                  tint={colors.icon}
                  textColor={colors.text}
                  {...descCard.soft}
                >
                  <BulletList items={med.raw?.descripcion?.instrucciones_de_uso ?? []} textColor={colors.text} />
                </FieldBlock>

                <FieldBlock
                  icon="info.circle"
                  title="Cuidados durante el tratamiento"
                  tint={colors.icon}
                  textColor={colors.text}
                  {...descCard.soft}
                >
                  <BulletList items={med.raw?.descripcion?.cuidados_durante_tratamiento ?? []} textColor={colors.text} />
                </FieldBlock>

                <FieldBlock
                  icon="exclamationmark.triangle.fill"
                  title="Advertencia"
                  tint={colors.tint}
                  textColor={colors.text}
                  {...descCard.tintStrong}
                >
                  {med.raw?.descripcion?.advertencia_si_pasa_esto ? (
                    <ThemedText style={{ opacity: 0.9 }}>{med.raw.descripcion.advertencia_si_pasa_esto}</ThemedText>
                  ) : (
                    <ThemedText style={{ opacity: 0.78 }}>No disponible.</ThemedText>
                  )}
                </FieldBlock>

                <FieldBlock
                  icon="lock.fill"
                  title="Contraindicaciones"
                  tint={colors.tint}
                  textColor={colors.text}
                  {...descCard.tintStrong}
                >
                  <BulletList items={med.raw?.descripcion?.contraindicaciones ?? []} textColor={colors.text} />
                </FieldBlock>

                <FieldBlock
                  icon="paperplane.fill"
                  title="Si olvidas una dosis"
                  tint={colors.icon}
                  textColor={colors.text}
                  {...descCard.neutral}
                >
                  {med.raw?.descripcion?.gestion_de_olvidos ? (
                    <ThemedText style={{ opacity: 0.9 }}>{med.raw.descripcion.gestion_de_olvidos}</ThemedText>
                  ) : (
                    <ThemedText style={{ opacity: 0.78 }}>No disponible.</ThemedText>
                  )}
                </FieldBlock>

                <FieldBlock
                  icon="lock.fill"
                  title="Cómo guardarlo"
                  tint={colors.icon}
                  textColor={colors.text}
                  {...descCard.neutral}
                >
                  {med.raw?.descripcion?.como_guardarlo ? (
                    <ThemedText style={{ opacity: 0.9 }}>{med.raw.descripcion.como_guardarlo}</ThemedText>
                  ) : (
                    <ThemedText style={{ opacity: 0.78 }}>No disponible.</ThemedText>
                  )}
                </FieldBlock>
              </View>

              <View style={{ gap: 10 }}>
                <ThemedText type="defaultSemiBold" style={{ opacity: 0.92 }}>
                  Advertencias
                </ThemedText>

                {med.advertencias.length ? (
                  <View style={{ gap: 8 }}>
                    {med.advertencias.map((w, idx) => (
                      <View key={`w-${idx}`} style={styles.warnRow}>
                        <View style={styles.warnLine}>
                          <IconSymbol name="exclamationmark.triangle.fill" size={16} color={withAlpha(colors.text, 0.78)} />
                          <ThemedText style={{ opacity: 0.9, flex: 1 }}>{w}</ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <ThemedText style={{ opacity: 0.78 }}>No hay advertencias disponibles.</ThemedText>
                )}
              </View>
            </>
          ) : (
            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
              <ThemedText style={{ opacity: 0.82 }}>Cargando detalle…</ThemedText>
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

  queryChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },

  medHeaderCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },

  ctaBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
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
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
