import * as Speech from 'expo-speech';
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
import { loadTramiteSegHistoryResult } from '@/lib/tramiteseg-history-store';
import { getTramiteSegResult } from '@/lib/tramiteseg-result-store';
import type { TramiteSegQueryResponse, TramiteSegSource } from '@/lib/tramiteseg-api';

function scoreLabel(score?: number) {
  if (!Number.isFinite(score)) return '—';
  return `${(Number(score) * 100).toFixed(1)}%`;
}

function markdownToSpeechText(value?: string) {
  if (!value) return '';
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

function SourceCard({ item, cardBg, border, textColor }: { item: TramiteSegSource; cardBg: string; border: string; textColor: string }) {
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

export default function TramiteSegAnalysisScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const params = useLocalSearchParams<{
    resultId?: string;
    historyId?: string;
    query?: string;
  }>();

  const resultId = typeof params.resultId === 'string' ? params.resultId : null;
  const historyId = typeof params.historyId === 'string' ? params.historyId : null;
  const query = typeof params.query === 'string' ? params.query : null;

  const [response, setResponse] = useState<TramiteSegQueryResponse | null>(null);
  const [speaking, setSpeaking] = useState(false);

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
    router.replace('/tramiteseg');
  }, []);

  const stopSpeech = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // ignore
    }
    setSpeaking(false);
  }, []);

  const speakAnswer = useCallback(() => {
    if (Platform.OS !== 'android') return;
    const text = markdownToSpeechText(response?.answer);
    if (!text) {
      Alert.alert('Sin texto', 'No hay respuesta para reproducir por voz.');
      return;
    }

    try {
      Speech.stop();
      setSpeaking(true);
      Speech.speak(text, {
        language: 'es-PE',
        pitch: 1,
        rate: 0.95,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch {
      setSpeaking(false);
      Alert.alert('TTS no disponible', 'No se pudo inicializar la voz en este dispositivo.');
    }
  }, [response?.answer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (resultId) {
        const r = getTramiteSegResult(resultId);
        if (r) {
          if (!cancelled) setResponse(r);
          return;
        }
      }

      if (historyId) {
        try {
          const stored = await loadTramiteSegHistoryResult(historyId);
          if (stored) {
            if (!cancelled) setResponse(stored);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (cancelled) return;
      Alert.alert('Consulta no disponible', 'Vuelve a realizar la consulta legal.');
      router.replace('/tramiteseg');
    })();

    return () => {
      cancelled = true;
      stopSpeech();
    };
  }, [resultId, historyId, stopSpeech]);

  const sources = response?.sources ?? [];
  const rewrite = response?.rewrite_info;

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=75"
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
            ConsultaLegal
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: divider }]} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.breadcrumbRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir a ConsultaLegal"
              onPress={() => router.replace('/tramiteseg')}
              style={({ pressed, hovered }) => [
                styles.breadcrumbBtn,
                pressed ? { opacity: 0.85 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.92 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <ThemedText style={{ opacity: 0.78 }}>ConsultaLegal</ThemedText>
            </Pressable>
            <IconSymbol name="chevron.right" size={16} color={withAlpha(colors.text, 0.45)} />
            <ThemedText style={{ opacity: 0.92, flex: 1 }} numberOfLines={1}>
              Resultado
            </ThemedText>
          </View>

          <SectionCard title="Consulta" backgroundColor={cardBg} borderColor={border}>
            <View style={[styles.textBlock, { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) }]}>
              <ThemedText style={{ opacity: 0.9 }}>{query ?? response?.query ?? '—'}</ThemedText>
            </View>
          </SectionCard>

          <SectionCard title="Respuesta" backgroundColor={cardBg} borderColor={border}>
            <Markdown style={markdownStyle}>
              {response?.answer?.trim() || 'Sin respuesta.'}
            </Markdown>

            {Platform.OS === 'android' ? (
              <View style={styles.ttsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={speakAnswer}
                  style={({ pressed, hovered }) => [
                    styles.ttsBtn,
                    { backgroundColor: withAlpha(colors.tint, 0.15), borderColor: withAlpha(colors.tint, 0.32) },
                    pressed ? { opacity: 0.9 } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                    {speaking ? 'Reproducir de nuevo' : 'Escuchar respuesta'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={stopSpeech}
                  style={({ pressed, hovered }) => [
                    styles.ttsBtn,
                    { backgroundColor: withAlpha('#000000', 0.08), borderColor: withAlpha(colors.text, 0.18) },
                    pressed ? { opacity: 0.9 } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={{ opacity: 0.88 }}>
                    Detener voz
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </SectionCard>

          <SectionCard title="Fuentes" backgroundColor={cardBg} borderColor={border}>
            <View style={styles.sourcesMeta}>
              <ThemedText style={{ opacity: 0.8 }}>
                {sources.length} {sources.length === 1 ? 'fuente' : 'fuentes'}
              </ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>
                Total reportado: {response?.total_sources_found ?? sources.length}
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
  textBlock: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  ttsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ttsBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
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