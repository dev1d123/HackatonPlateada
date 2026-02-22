import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteLegalAsiHistoryItem,
  loadLegalAsiHistory,
  loadLegalAsiHistoryResult,
  upsertLegalAsiHistoryItem,
  type LegalAsiHistoryItem,
} from '@/lib/legalasi-history-store';
import { putLegalAsiResult } from '@/lib/legalasi-result-store';

type Selection =
  | { kind: 'image'; imageUri: string }
  | { kind: 'pdf'; pdfUri: string; fileName: string };

function formatConsultaDate(ts: number) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function LegalAsiScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [selected, setSelected] = useState<Selection | null>(null);
  const [history, setHistory] = useState<LegalAsiHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await loadLegalAsiHistory();
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
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    setSelected({ kind: 'image', imageUri: uri });
  }, []);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para usar la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    setSelected({ kind: 'image', imageUri: uri });
  }, []);

  const pickPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setSelected({
        kind: 'pdf',
        pdfUri: asset.uri,
        fileName: asset.name ?? 'documento.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el PDF.');
    }
  }, []);

  const onConsultar = useCallback(() => {
    if (!selected) return;
    const now = Date.now();
    const item: LegalAsiHistoryItem =
      selected.kind === 'image'
        ? {
            id: `${now}-${Math.random().toString(16).slice(2)}`,
            kind: 'image',
            imageUri: selected.imageUri,
            createdAt: now,
          }
        : {
            id: `${now}-${Math.random().toString(16).slice(2)}`,
            kind: 'pdf',
            pdfUri: selected.pdfUri,
            fileName: selected.fileName,
            createdAt: now,
          };

    setHistory((prev) => [item, ...prev]);
    void upsertLegalAsiHistoryItem(item);

    router.push({
      pathname: '/legalasi-loading',
      params:
        selected.kind === 'image'
          ? {
              imageUri: selected.imageUri,
              historyId: item.id,
            }
          : {
              pdfUri: selected.pdfUri,
              fileName: selected.fileName,
              historyId: item.id,
            },
    });
  }, [selected]);

  const confirmDelete = useCallback((id: string) => {
    Alert.alert('Eliminar consulta', '¿Seguro que quieres eliminar esta consulta del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setHistory((prev) => prev.filter((h) => h.id !== id));
          void deleteLegalAsiHistoryItem(id);
        },
      },
    ]);
  }, []);

  const openHistoryItem = useCallback(async (h: LegalAsiHistoryItem) => {
    try {
      const stored = await loadLegalAsiHistoryResult(h.id);
      if (!stored) {
        Alert.alert('Sin resultado guardado', 'Este item aún no tiene un resultado asociado. Realiza una nueva consulta.');
        return;
      }

      const resultId = putLegalAsiResult(stored);
      router.push({
        pathname: '/legalasi-analysis',
        params: {
          resultId,
          historyId: h.id,
          imageUri: h.kind === 'image' ? h.imageUri : undefined,
          fileName: h.kind === 'pdf' ? h.fileName : undefined,
          inputKind: h.kind,
        },
      });
    } catch {
      Alert.alert('Error', 'No se pudo abrir este resultado guardado.');
    }
  }, []);

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

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1400&q=75"
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
            AnalizaLegal
          </ThemedText>

          <View style={styles.topSpacer} />
        </View>

        <View style={[styles.divider, { backgroundColor: headerBorder }]} />

        {!selected ? (
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

            <Pressable
              accessibilityRole="button"
              onPress={pickPdf}
              style={({ pressed, hovered }) => [
                styles.pdfCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
                pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.18) }]}>
                <IconSymbol name="gavel.fill" size={22} color={colors.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Subir PDF</ThemedText>
                <ThemedText style={{ opacity: 0.78 }}>Analiza tu documento legal en segundos.</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={18} color={withAlpha(colors.text, 0.5)} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.previewBlock}>
            {selected.kind === 'image' ? (
              <View style={[styles.previewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Image source={{ uri: selected.imageUri }} contentFit="cover" transition={180} style={styles.previewImage} />
                <View style={styles.previewOverlay}>
                  <ThemedText type="defaultSemiBold">Imagen seleccionada</ThemedText>
                </View>
              </View>
            ) : (
              <View style={[styles.pdfPreview, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.tint, 0.18) }]}>
                  <IconSymbol name="gavel.fill" size={22} color={colors.tint} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="defaultSemiBold">PDF seleccionado</ThemedText>
                  <ThemedText style={{ opacity: 0.78 }} numberOfLines={2}>
                    {selected.fileName}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.65 }}>
                    Revisaremos la primera página del archivo para darte una lectura inicial.
                  </ThemedText>
                </View>
              </View>
            )}

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
                <ThemedText style={styles.primaryText}>Analizar documento</ThemedText>
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
                  onPress={pickPdf}
                  style={({ pressed, hovered }) => [
                    styles.secondaryButton,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                    pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                    hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  ]}
                >
                  <IconSymbol name="gavel.fill" size={18} color={colors.tint} />
                  <ThemedText type="defaultSemiBold">Cambiar PDF</ThemedText>
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
                Aún no hay consultas. Toma/sube una foto o sube un PDF para comenzar.
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
                  <Image source={{ uri: h.imageUri }} contentFit="cover" transition={120} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbText, { backgroundColor: withAlpha(colors.tint, 0.16) }]}>
                    <IconSymbol name="gavel.fill" size={18} color={colors.tint} />
                  </View>
                )}
                <View style={styles.historyText}>
                  <ThemedText type="defaultSemiBold">Consulta del {formatConsultaDate(h.createdAt)}</ThemedText>
                  <ThemedText style={{ opacity: 0.78 }} numberOfLines={1}>
                    {h.kind === 'pdf' ? h.fileName || 'Documento PDF' : 'Documento en imagen'}
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
  pdfCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  pdfPreview: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
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