import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteTramiteSegHistoryItem,
  loadTramiteSegHistory,
  loadTramiteSegHistoryResult,
  type TramiteSegHistoryItem,
  upsertTramiteSegHistoryItem,
} from '@/lib/tramiteseg-history-store';
import { putTramiteSegResult } from '@/lib/tramiteseg-result-store';

function formatConsultaDate(ts: number) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function TramiteSegScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<TramiteSegHistoryItem[]>([]);
  const [recognizing, setRecognizing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await loadTramiteSegHistory();
        if (!cancelled) setHistory(items);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const headerBorder = useMemo(
    () => withAlpha(colors.text, colorScheme === 'dark' ? 0.18 : 0.14),
    [colors.text, colorScheme]
  );

  const cardBg = useMemo(
    () => withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
    [colors.background, colorScheme]
  );

  const cardBorder = useMemo(() => withAlpha(colors.text, 0.16), [colors.text]);

  const onBack = useCallback(() => {
    if (typeof (router as any).canGoBack === 'function') {
      const can = (router as any).canGoBack();
      if (can) {
        router.back();
        return;
      }
    }
    router.replace('/dashboard');
  }, []);

  const onStartDictation = useCallback(async () => {
    Alert.alert('STT no disponible', 'El dictado por voz requiere un development build con módulo nativo. Por ahora puedes escribir la consulta.');
  }, []);

  const onStopDictation = useCallback(() => {
    setRecognizing(false);
  }, []);

  const onConsultar = useCallback(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      Alert.alert('Consulta requerida', 'Escribe o dicta una consulta legal para continuar.');
      return;
    }

    const now = Date.now();
    const item: TramiteSegHistoryItem = {
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      createdAt: now,
      query: cleanQuery,
    };

    setHistory((prev) => [item, ...prev]);
    void upsertTramiteSegHistoryItem(item);

    router.push({
      pathname: '/tramiteseg-loading',
      params: {
        query: item.query,
        historyId: item.id,
      },
    });
  }, [query]);

  const confirmDelete = useCallback((id: string) => {
    Alert.alert('Eliminar consulta', '¿Seguro que quieres eliminar esta consulta del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setHistory((prev) => prev.filter((h) => h.id !== id));
          void deleteTramiteSegHistoryItem(id);
        },
      },
    ]);
  }, []);

  const openHistoryItem = useCallback(async (h: TramiteSegHistoryItem) => {
    try {
      const stored = await loadTramiteSegHistoryResult(h.id);
      if (!stored) {
        Alert.alert('Sin resultado guardado', 'Este item aún no tiene un resultado asociado. Realiza una nueva consulta.');
        return;
      }

      const resultId = putTramiteSegResult(stored);
      router.push({
        pathname: '/tramiteseg-analysis',
        params: {
          resultId,
          historyId: h.id,
          query: h.query,
        },
      });
    } catch {
      Alert.alert('Error', 'No se pudo abrir este resultado guardado.');
    }
  }, []);

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=75"
      particleCount={14}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            style={({ pressed, hovered }) => [
              styles.iconButton,
              { backgroundColor: cardBg, borderColor: cardBorder },
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

        <View style={[styles.divider, { backgroundColor: headerBorder }]} />

        <View style={[styles.inputCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.inputHeader}>
            <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.18) }]}>
              <IconSymbol name="mic.fill" size={20} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Asistente legal por texto/voz</ThemedText>
              <ThemedText style={{ opacity: 0.78 }}>
                Escribe o dicta tu consulta en lenguaje natural.
              </ThemedText>
            </View>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ejemplo: ¿Cuáles son mis derechos fundamentales?"
            placeholderTextColor={withAlpha(colors.text, 0.45)}
            multiline
            textAlignVertical="top"
            style={[
              styles.queryInput,
              {
                color: colors.text,
                borderColor: withAlpha(colors.text, 0.14),
                backgroundColor: withAlpha('#000000', 0.05),
              },
            ]}
          />

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={recognizing ? onStopDictation : onStartDictation}
              style={({ pressed, hovered }) => [
                styles.secondaryButton,
                {
                  backgroundColor: recognizing ? withAlpha(colors.tint, 0.16) : withAlpha('#000000', 0.08),
                  borderColor: recognizing ? withAlpha(colors.tint, 0.35) : withAlpha(colors.text, 0.18),
                },
                pressed ? { opacity: 0.92 } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <IconSymbol name={recognizing ? 'xmark' : 'mic.fill'} size={16} color={recognizing ? colors.tint : withAlpha(colors.text, 0.85)} />
              <ThemedText type="defaultSemiBold" style={{ color: recognizing ? colors.tint : withAlpha(colors.text, 0.88) }}>
                {recognizing ? 'Detener dictado' : 'Dictar consulta'}
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConsultar}
              disabled={!query.trim()}
              style={({ pressed, hovered }) => [
                styles.primaryButton,
                {
                  backgroundColor: query.trim() ? withAlpha(colors.tint, 0.95) : withAlpha(colors.text, 0.14),
                  borderColor: query.trim() ? withAlpha(colors.tint, 0.35) : withAlpha(colors.text, 0.2),
                },
                pressed && query.trim() ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: query.trim() ? 'pointer' : 'default' } as any) : null,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: query.trim() ? '#ffffff' : withAlpha(colors.text, 0.55) }}>
                Consultar
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.historyHeader}>
          <ThemedText type="subtitle">Consultas anteriores</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.historyList} showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <View style={[styles.historyEmpty, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <ThemedText style={{ opacity: 0.82 }}>
                Aún no hay consultas. Escribe o dicta una pregunta legal para comenzar.
              </ThemedText>
            </View>
          ) : (
            history.map((h) => (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityLabel="Abrir consulta"
                onPress={() => void openHistoryItem(h)}
                style={({ pressed, hovered }) => [
                  styles.historyItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                  pressed ? { opacity: 0.92, transform: [{ scale: 0.995 }] } : null,
                  hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                ]}
              >
                <View style={[styles.thumb, styles.thumbText, { backgroundColor: withAlpha(colors.tint, 0.16) }]}>
                  <IconSymbol name="mic.fill" size={18} color={colors.tint} />
                </View>

                <View style={styles.historyText}>
                  <ThemedText type="defaultSemiBold">Consulta del {formatConsultaDate(h.createdAt)}</ThemedText>
                  <ThemedText style={{ opacity: 0.78 }} numberOfLines={2}>
                    {h.query}
                  </ThemedText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar consulta"
                  onPress={() => confirmDelete(h.id)}
                  hitSlop={10}
                  style={({ pressed, hovered }) => [
                    styles.deleteButton,
                    { backgroundColor: withAlpha('#000000', colorScheme === 'dark' ? 0.18 : 0.08) },
                    pressed ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <IconSymbol name="trash" size={18} color={withAlpha(colors.text, 0.85)} />
                </Pressable>
              </Pressable>
            ))
          )}
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
    fontSize: 24,
    lineHeight: 28,
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
  inputCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHeader: {
    marginBottom: 10,
  },
  historyList: {
    gap: 10,
    paddingBottom: 6,
  },
  historyEmpty: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  historyItem: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 14,
  },
  thumbText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});