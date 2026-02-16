import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { withAlpha } from '@/components/color';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STATUS_MESSAGES = [
  'Enviando al backend…',
  'Analizando la imagen…',
  'Extrayendo medicamentos…',
  'Buscando mejores precios…',
  'Obteniendo mejores resultados…',
  'Preparando el reporte…',
];

export default function AhorraMedLoadingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ imageUri?: string }>();

  const imageUri = typeof params.imageUri === 'string' ? params.imageUri : null;

  const [statusIndex, setStatusIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const barBg = useMemo(
    () => withAlpha(colors.text, colorScheme === 'dark' ? 0.22 : 0.14),
    [colors.text, colorScheme]
  );

  const barFill = useMemo(
    () => withAlpha(colors.tint, colorScheme === 'dark' ? 0.95 : 0.92),
    [colors.tint, colorScheme]
  );

  useEffect(() => {
    if (!imageUri) {
      router.replace('/ahorramed');
      return;
    }

    progress.setValue(0);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 5200,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (!finished) return;
      router.replace({ pathname: '/ahorramed-analysis', params: { imageUri } });
    });

    const tick = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 900);

    return () => {
      clearInterval(tick);
      progress.stopAnimation();
    };
  }, [imageUri, progress]);

  const widthInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '100%'],
  });

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1600&q=75"
      particleCount={10}
    >
      <View style={styles.container}>
        <View style={styles.center}>
          <ThemedText type="title" style={styles.title}>
            Procesando consulta
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: withAlpha(colors.text, 0.82) }]}>
            {STATUS_MESSAGES[statusIndex]}
          </ThemedText>

          <View style={[styles.barOuter, { backgroundColor: barBg }]}
          >
            <Animated.View style={[styles.barInner, { backgroundColor: barFill, width: widthInterpolate }]} />
          </View>

          <ThemedText style={[styles.small, { color: withAlpha(colors.text, 0.72) }]}>
            (Modo demo) El backend aún no está implementado.
          </ThemedText>

          {Platform.OS === 'web' ? (
            <ThemedText style={[styles.small, { color: withAlpha(colors.text, 0.68) }]}>
              Sugerencia: abre el mapa en web para Leaflet.
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
  title: {
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  barOuter: {
    width: '100%',
    maxWidth: 420,
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 999,
  },
  small: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
