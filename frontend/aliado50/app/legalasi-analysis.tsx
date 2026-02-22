import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadLegalAsiHistoryResult } from '@/lib/legalasi-history-store';
import { getLegalAsiResult } from '@/lib/legalasi-result-store';
import type { LegalAnalyzeResponse, LegalSource } from '@/lib/legalasi-api';

function prettyType(raw?: string) {
  if (!raw) return 'No identificado';
  return raw
    .split('_')
    .filter(Boolean)
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(' ');
}

function scoreLabel(score?: number) {
  if (!Number.isFinite(score)) return '—';
  return `${(Number(score) * 100).toFixed(1)}%`;
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

function SourceCard({ item, cardBg, border, textColor }: { item: LegalSource; cardBg: string; border: string; textColor: string }) {
  return (
    <View style={[styles.sourceCard, { backgroundColor: withAlpha('#000000', 0.05), borderColor: border }]}>
      <View style={styles.sourceHeader}>
        <View style={[styles.sourceBadge, { backgroundColor: withAlpha(textColor, 0.09), borderColor: withAlpha(textColor, 0.2) }]}>
          <ThemedText type="defaultSemiBold" style={{ opacity: 0.9 }}>
            {item.label ?? item.id ?? 'Fuente'}
          </ThemedText>
        </View>
        <ThemedText style={{ opacity: 0.72 }}>Relevancia: {scoreLabel(item.similarity_score)}</ThemedText>
      </View>

      {item.hierarchy?.title ? <ThemedText style={{ opacity: 0.86 }}>{item.hierarchy.title}</ThemedText> : null}
      {item.hierarchy?.chapter ? <ThemedText style={{ opacity: 0.74 }}>{item.hierarchy.chapter}</ThemedText> : null}
      {item.hierarchy?.section ? <ThemedText style={{ opacity: 0.7 }}>{item.hierarchy.section}</ThemedText> : null}

      {item.text ? (
        <View style={[styles.sourceTextWrap, { borderColor: border, backgroundColor: cardBg }]}>
          <ThemedText style={{ opacity: 0.86 }}>{item.text}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export default function LegalAsiAnalysisScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const params = useLocalSearchParams<{
    resultId?: string;
    historyId?: string;
    imageUri?: string;
    fileName?: string;
    inputKind?: string;
  }>();

  const resultId = typeof params.resultId === 'string' ? params.resultId : null;
  const historyId = typeof params.historyId === 'string' ? params.historyId : null;
  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;
  const fileName = typeof params.fileName === 'string' ? params.fileName : null;
  const inputKind = params.inputKind === 'pdf' ? 'pdf' : 'image';

  const [response, setResponse] = useState<LegalAnalyzeResponse | null>(null);

  const cardBg = useMemo(
    () => withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
    [colors.background, colorScheme]
  );

  const border = useMemo(() => withAlpha(colors.text, 0.16), [colors.text]);
  const divider = useMemo(
    () => withAlpha(colors.text, colorScheme === 'dark' ? 0.18 : 0.14),
    [colors.text, colorScheme]
  );

  const markdownStyle = useMemo(
    () => ({
      body: { color: withAlpha(colors.text, 0.92), fontSize: 15, lineHeight: 22 },
      paragraph: { marginTop: 0, marginBottom: 10 },
      bullet_list: { marginBottom: 10 },
      ordered_list: { marginBottom: 10 },
      heading3: { color: withAlpha(colors.text, 0.95), marginTop: 2, marginBottom: 8 },
      heading4: { color: withAlpha(colors.text, 0.95), marginTop: 2, marginBottom: 8 },
      strong: { color: withAlpha(colors.text, 0.98) },
    }),
    [colors.text]
  );

  const onBack = useCallback(() => {
    if (typeof (router as any).canGoBack === 'function') {
      const can = (router as any).canGoBack();
      if (can) {
        router.back();
        return;
      }
    }
    router.replace('/legalasi');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (resultId) {
        const r = getLegalAsiResult(resultId);
        if (r) {
          if (!cancelled) setResponse(r);
          return;
        }
      }

      if (historyId) {
        try {
          const stored = await loadLegalAsiHistoryResult(historyId);
          if (stored) {
            if (!cancelled) setResponse(stored);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (cancelled) return;
      Alert.alert('Consulta no disponible', 'Vuelve a realizar el análisis legal.');
      router.replace('/legalasi');
    })();

    return () => {
      cancelled = true;
    };
  }, [resultId, historyId]);

  const sources = response?.legal_copilot_response?.sources ?? [];
  const rewrite = response?.legal_copilot_response?.rewrite_info;

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=75"
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
            AnalizaLegal
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: divider }]} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.breadcrumbRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a AnalizaLegal"
              onPress={() => router.replace('/legalasi')}
              style={({ pressed, hovered }) => [
                styles.breadcrumbBtn,
                pressed ? { opacity: 0.85 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.92 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText style={{ opacity: 0.78 }}>AnalizaLegal</ThemedText>
            </Pressable>
            <IconSymbol name="chevron.right" size={16} color={withAlpha(colors.text, 0.45)} />
            <ThemedText style={{ opacity: 0.92, flex: 1 }} numberOfLines={1}>
              {prettyType(response?.type)}
            </ThemedText>
          </View>

          {inputKind === 'image' && imageUri ? (
            <View style={[styles.photoCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Image source={{ uri: imageUri }} contentFit="cover" style={styles.photo} transition={140} />
              <View style={styles.photoOverlay}>
                <ThemedText type="defaultSemiBold">Documento analizado</ThemedText>
              </View>
            </View>
          ) : (
            <View style={[styles.queryChip, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
              <ThemedText type="defaultSemiBold">Documento PDF</ThemedText>
              <ThemedText style={{ opacity: 0.82 }} numberOfLines={2}>
                {fileName ?? 'Documento.pdf'}
              </ThemedText>
            </View>
          )}

          <SectionCard title="Clasificación" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.typeRow}>
              <View style={[styles.typeBadge, { backgroundColor: withAlpha(colors.tint, 0.14), borderColor: withAlpha(colors.tint, 0.32) }]}>
                <IconSymbol name="gavel.fill" size={16} color={colors.tint} />
                <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                  {prettyType(response?.type)}
                </ThemedText>
              </View>
            </View>
            <Markdown style={markdownStyle}>{response?.explanation?.trim() || 'No se recibió explicación del documento.'}</Markdown>
          </SectionCard>

          <SectionCard title="Texto extraído" backgroundColor={cardBg} borderColor={border}>
            <View style={[styles.textBlock, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
              <Markdown style={markdownStyle}>{response?.extracted_text?.trim() || 'No se extrajo texto.'}</Markdown>
            </View>
          </SectionCard>

          <SectionCard title="Respuesta del copiloto legal" backgroundColor={cardBg} borderColor={border}>
            <Markdown style={markdownStyle}>
              {response?.legal_copilot_response?.answer?.trim() || 'Sin respuesta del copiloto legal.'}
            </Markdown>
            {response?.legal_copilot_response?.query ? (
              <View style={[styles.queryInline, { borderColor: withAlpha(colors.text, 0.14), backgroundColor: withAlpha('#000000', 0.05) }]}>
                <ThemedText type="defaultSemiBold">Consulta usada:</ThemedText>
                <ThemedText style={{ opacity: 0.84 }}>{response.legal_copilot_response.query}</ThemedText>
              </View>
            ) : null}
          </SectionCard>

          <SectionCard title="Fuentes" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.sourcesMeta}>
              <ThemedText style={{ opacity: 0.8 }}>
                {sources.length} {sources.length === 1 ? 'fuente' : 'fuentes'}
              </ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>
                Total reportado: {response?.legal_copilot_response?.total_sources_found ?? sources.length}
              </ThemedText>
            </View>

            {sources.length > 0 ? (
              <View style={styles.sourcesList}>
                {sources.map((s, idx) => (
                  <SourceCard
                    key={`${s.id ?? 'src'}-${idx}`}
                    item={s}
                    cardBg={withAlpha(colors.background, colorScheme === 'dark' ? 0.3 : 0.92)}
                    border={withAlpha(colors.text, 0.14)}
                    textColor={colors.text}
                  />
                ))}
              </View>
            ) : (
              <ThemedText style={{ opacity: 0.78 }}>No hay fuentes disponibles en esta respuesta.</ThemedText>
            )}
          </SectionCard>

          <SectionCard title="Información de reescritura" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.metaList}>
              <View style={[styles.metaRow, { borderColor: withAlpha(colors.text, 0.12) }]}>
                <ThemedText type="defaultSemiBold">Tema legal</ThemedText>
                <ThemedText style={{ opacity: 0.82, flex: 1, textAlign: 'right' }}>
                  {rewrite?.tema_legal || 'No identificado'}
                </ThemedText>
              </View>

              <View style={[styles.metaRow, { borderColor: withAlpha(colors.text, 0.12) }]}>
                <ThemedText type="defaultSemiBold">Conceptos clave</ThemedText>
                <ThemedText style={{ opacity: 0.82, flex: 1, textAlign: 'right' }}>
                  {(rewrite?.conceptos_clave ?? []).length > 0 ? rewrite?.conceptos_clave?.join(', ') : 'Sin conceptos'}
                </ThemedText>
              </View>

              <View style={[styles.metaRow, { borderColor: withAlpha(colors.text, 0.12) }]}>
                <ThemedText type="defaultSemiBold">Leyes relevantes</ThemedText>
                <ThemedText style={{ opacity: 0.82, flex: 1, textAlign: 'right' }}>
                  {(rewrite?.leyes_relevantes ?? []).length > 0 ? rewrite?.leyes_relevantes?.join(', ') : 'Sin leyes'}
                </ThemedText>
              </View>
            </View>

            {(rewrite?.queries_optimizadas ?? []).length > 0 ? (
              <View style={styles.optimizedQueries}>
                <ThemedText type="defaultSemiBold">Queries optimizadas</ThemedText>
                {(rewrite?.queries_optimizadas ?? []).map((q, idx) => (
                  <View key={`${idx}-${q.slice(0, 16)}`} style={styles.queryLine}>
                    <IconSymbol name="chevron.right" size={15} color={withAlpha(colors.text, 0.55)} />
                    <ThemedText style={{ opacity: 0.86, flex: 1 }}>{q}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
          </SectionCard>
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textBlock: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  queryInline: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  sourcesMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sourcesList: {
    gap: 10,
  },
  sourceCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceTextWrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  metaList: {
    gap: 2,
  },
  metaRow: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optimizedQueries: {
    gap: 8,
  },
  queryLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
});