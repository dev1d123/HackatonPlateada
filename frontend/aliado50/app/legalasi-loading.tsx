import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveLegalAsiHistoryResult } from '@/lib/legalasi-history-store';
import { analyzeLegalDocumentFromImage } from '@/lib/legalasi-api';
import { putLegalAsiResult } from '@/lib/legalasi-result-store';
import { convertPdfFirstPageToImage } from '@/lib/pdf-to-image';

const STATUS_MESSAGES = [
  'Preparando archivo…',
  'Convirtiendo documento…',
  'Enviando al backend…',
  'Analizando contenido legal…',
  'Consultando copiloto legal…',
  'Construyendo reporte…',
];

export default function LegalAsiLoadingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ imageUri?: string; pdfUri?: string; fileName?: string; historyId?: string }>();

  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;
  const pdfUri = typeof params.pdfUri === 'string' ? params.pdfUri : null;
  const fileName = typeof params.fileName === 'string' ? params.fileName : null;
  const historyId = typeof params.historyId === 'string' ? params.historyId : null;

  const [statusIndex, setStatusIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const barBg = useMemo(
    () => withAlpha(colors.text, colorScheme === 'dark' ? 0.22 : 0.14),
    [colors.text, colorScheme]
  );

  const barFill = useMemo(
    () => withAlpha(colors.tint, colorScheme === 'dark' ? 0.95 : 0.92),
    [colors.tint, colorScheme]
  );

  useEffect(() => {
    if (!imageUri && !pdfUri) {
      router.replace('/legalasi');
      return;
    }

    progress.setValue(0);

    let cancelled = false;

    const tick = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 900);

    const anim = Animated.timing(progress, {
      toValue: 0.92,
      duration: 9000,
      useNativeDriver: false,
    });
    anim.start();

    (async () => {
      try {
        const result = imageUri
          ? await analyzeLegalDocumentFromImage({ imageUri })
          : await (async () => {
              const converted = await convertPdfFirstPageToImage(pdfUri as string);
              return analyzeLegalDocumentFromImage({
                imageBase64: converted.base64,
                imageMimeType: converted.mimeType,
              });
            })();

        if (historyId) {
          await saveLegalAsiHistoryResult(historyId, result);
        }

        if (cancelled) return;

        const resultId = putLegalAsiResult(result);

        clearInterval(tick);
        progress.stopAnimation();
        Animated.timing(progress, {
          toValue: 1,
          duration: 280,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (!finished || cancelled) return;
          router.replace({
            pathname: '/legalasi-analysis',
            params: {
              resultId,
              historyId: historyId ?? undefined,
              imageUri: imageUri ?? undefined,
              fileName: fileName ?? undefined,
              inputKind: imageUri ? 'image' : 'pdf',
            },
          });
        });
      } catch (e: any) {
        if (cancelled) return;
        clearInterval(tick);
        const msg = typeof e?.message === 'string' ? e.message : 'No se pudo completar la consulta.';
        Alert.alert('Error', msg);
        router.replace('/legalasi');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
      progress.stopAnimation();
    };
  }, [imageUri, pdfUri, fileName, historyId, progress]);

  useEffect(() => {
    spin.setValue(0);
    pulse.setValue(0);

    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );

    spinAnim.start();
    pulseAnim.start();

    return () => {
      spinAnim.stop();
      pulseAnim.stop();
    };
  }, [spin, pulse]);

  const widthInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '100%'],
  });

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 0.92],
  });

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=75"
      particleCount={10}
    >
      <View style={styles.container}>
        <View style={styles.center}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
                borderColor: withAlpha(colors.text, 0.16),
              },
            ]}
          >
            <View style={styles.loaderRow}>
              <View
                style={[
                  styles.loaderRingWrap,
                  { backgroundColor: withAlpha('#000000', 0.06), borderColor: withAlpha(colors.text, 0.14) },
                ]}
              >
                <Animated.View
                  style={[
                    styles.loaderRing,
                    {
                      borderColor: withAlpha(colors.text, 0.18),
                      borderTopColor: withAlpha(colors.tint, 0.95),
                      transform: [{ rotate: spinInterpolate }],
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="title" style={styles.title}>
                  Procesando documento
                </ThemedText>
                <Animated.View style={{ opacity: pulseOpacity }}>
                  <ThemedText style={[styles.subtitle, { color: withAlpha(colors.text, 0.82) }]}>
                    {STATUS_MESSAGES[statusIndex]}
                  </ThemedText>
                </Animated.View>
              </View>
            </View>

            <View style={[styles.barOuter, { backgroundColor: barBg }]}>
              <Animated.View style={[styles.barInner, { backgroundColor: barFill, width: widthInterpolate }]} />
            </View>

            <ThemedText style={[styles.small, { color: withAlpha(colors.text, 0.72) }]}>
              Mantén esta pantalla abierta mientras preparamos el análisis legal.
            </ThemedText>
          </View>

          {!imageUri ? (
            <ThemedText style={[styles.small, { color: withAlpha(colors.text, 0.68) }]}>
              Estamos leyendo tu PDF para generar el análisis legal.
            </ThemedText>
          ) : null}
        </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loaderRingWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  barOuter: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 999,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});