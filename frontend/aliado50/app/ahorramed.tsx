import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadAhorraMedHistory, loadAhorraMedHistoryResult, deleteAhorraMedHistoryItem, upsertAhorraMedHistoryItem } from '@/lib/ahorramed-history-store';
import { putAhorraMedResult } from '@/lib/ahorramed-result-store';

type HistoryItem = {
  id: string;
  createdAt: number;
  kind: 'image' | 'text';
  imageUri?: string;
  text?: string;
};

function formatConsultaDate(ts: number) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function AhorraMedScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await loadAhorraMedHistory();
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

  const cardBorder = useMemo(
    () => withAlpha(colors.text, 0.16),
    [colors.text]
  );

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled) return;
    setSelectedImageUri(result.assets?.[0]?.uri ?? null);
  }, []);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para usar la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (result.canceled) return;
    setSelectedImageUri(result.assets?.[0]?.uri ?? null);
  }, []);

  const onConsultar = useCallback(() => {
    if (!selectedImageUri) return;
    const now = Date.now();
    const item: HistoryItem = {
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      kind: 'image',
      imageUri: selectedImageUri,
      createdAt: now,
    };
    setHistory((prev) => [item, ...prev]);
    void upsertAhorraMedHistoryItem(item);
    router.push({ pathname: '/ahorramed-loading', params: { imageUri: selectedImageUri, historyId: item.id } });
  }, [selectedImageUri]);

  const onConsultarTexto = useCallback(() => {
    const text = queryText.trim();
    if (!text) return;
    const now = Date.now();
    const item: HistoryItem = {
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      kind: 'text',
      text,
      createdAt: now,
    };
    setHistory((prev) => [item, ...prev]);
    void upsertAhorraMedHistoryItem(item);
    setQueryText('');
    router.push({ pathname: '/ahorramed-loading', params: { text, historyId: item.id } });
  }, [queryText]);

  const confirmDelete = useCallback((id: string) => {
    Alert.alert('Eliminar consulta', '¿Seguro que quieres eliminar esta consulta del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setHistory((prev) => prev.filter((h) => h.id !== id));
          void deleteAhorraMedHistoryItem(id);
        },
      },
    ]);
  }, []);

  const openHistoryItem = useCallback(async (h: HistoryItem) => {
    try {
      const stored = await loadAhorraMedHistoryResult(h.id);
      if (!stored) {
        Alert.alert('Sin resultado guardado', 'Este item aún no tiene un resultado asociado. Realiza una nueva consulta.');
        return;
      }

      const resultId = putAhorraMedResult(stored);
      router.push({
        pathname: '/ahorramed-analysis',
        params: {
          resultId,
          historyId: h.id,
          imageUri: h.kind === 'image' ? h.imageUri : undefined,
          text: h.kind === 'text' ? h.text : undefined,
        },
      });
    } catch {
      Alert.alert('Error', 'No se pudo abrir este resultado guardado.');
    }
  }, []);

  const onBack = useCallback(() => {
    // On web refresh / direct entry, there may be no back history.
    if (typeof (router as any).canGoBack === 'function') {
      const can = (router as any).canGoBack();
      if (can) {
        router.back();
        return;
      }
    }
    router.replace('/dashboard');
  }, []);

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1400&q=75"
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
            AhorraMed
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: headerBorder }]} />

        {!selectedImageUri ? (
          <View style={styles.actionsWrap}>
            <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={takePhoto}
              style={({ pressed, hovered }) => [
                styles.actionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
                pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.18) }]}>
                <IconSymbol name="camera" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold">Tomar foto</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={pickFromGallery}
              style={({ pressed, hovered }) => [
                styles.actionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
                pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.18) }]}>
                <IconSymbol name="photo" size={22} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold">Subir foto</ThemedText>
            </Pressable>
            </View>

            <View style={[styles.textSearchCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.textSearchRow}>
                <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.18) }]}>
                  <IconSymbol name="magnifyingglass" size={20} color={colors.tint} />
                </View>

                <TextInput
                  value={queryText}
                  onChangeText={setQueryText}
                  placeholder="Buscar por texto"
                  placeholderTextColor={withAlpha(colors.text, 0.45)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={onConsultarTexto}
                  style={[styles.textInput, { color: colors.text }]}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={onConsultarTexto}
                  disabled={!queryText.trim()}
                  style={({ pressed, hovered }) => [
                    styles.textSearchBtn,
                    {
                      backgroundColor: queryText.trim() ? withAlpha(colors.tint, 0.92) : withAlpha(colors.text, 0.12),
                      borderColor: queryText.trim() ? withAlpha(colors.tint, 0.35) : cardBorder,
                    },
                    pressed && queryText.trim() ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: queryText.trim() ? 'pointer' : 'default' } as any) : null,
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={{ color: queryText.trim() ? '#ffffff' : withAlpha(colors.text, 0.55) }}>
                    Buscar
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewBlock}>
            <View style={[styles.previewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Image
                source={{ uri: selectedImageUri }}
                contentFit="cover"
                transition={180}
                style={styles.previewImage}
              />
              <View style={styles.previewOverlay}>
                <ThemedText type="defaultSemiBold">Foto seleccionada</ThemedText>
              </View>
            </View>

            <View style={styles.previewActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onConsultar}
                style={({ pressed, hovered }) => [
                  styles.primaryButton,
                  { backgroundColor: withAlpha(colors.tint, 0.95) },
                  pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                  hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                ]}
              >
                <ThemedText style={styles.primaryText}>Consultar</ThemedText>
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={takePhoto}
                  style={({ pressed, hovered }) => [
                    styles.secondaryButton,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                    pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <IconSymbol name="camera" size={18} color={colors.tint} />
                  <ThemedText type="defaultSemiBold">Nueva foto</ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={pickFromGallery}
                  style={({ pressed, hovered }) => [
                    styles.secondaryButton,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                    pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <IconSymbol name="photo" size={18} color={colors.tint} />
                  <ThemedText type="defaultSemiBold">Galería</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View style={styles.historyHeader}>
          <ThemedText type="subtitle">Consultas anteriores</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.historyList} showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <View style={[styles.historyEmpty, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <ThemedText style={{ opacity: 0.82 }}>
                Aún no hay consultas. Sube/toma una foto o busca por texto para comenzar.
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
                {h.kind === 'image' && h.imageUri ? (
                  <Image
                    source={{ uri: h.imageUri }}
                    contentFit="cover"
                    transition={120}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbText, { backgroundColor: withAlpha(colors.tint, 0.16) }]}>
                    <IconSymbol name="text.magnifyingglass" size={18} color={colors.tint} />
                  </View>
                )}
                <View style={styles.historyText}>
                  <ThemedText type="defaultSemiBold">Consulta del {formatConsultaDate(h.createdAt)}</ThemedText>
                  {h.kind === 'text' && h.text ? (
                    <ThemedText style={{ opacity: 0.78 }} numberOfLines={1}>
                      {h.text}
                    </ThemedText>
                  ) : null}
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

  actionsWrap: {
    gap: 12,
    marginBottom: 18,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textSearchCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  textSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  textSearchBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewBlock: {
    marginBottom: 18,
    gap: 12,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    height: 220,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  previewActions: {
    gap: 10,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 16,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 10,
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
  },
  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
