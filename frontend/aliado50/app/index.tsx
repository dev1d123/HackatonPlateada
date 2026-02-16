import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/screen-background';
import { withAlpha } from '@/components/color';
import { AuroraBackground } from '@/components/aurora-background';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SplashScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const progressWidth = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [progress]
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3600);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, [progress, pulse]);

  const titleScale = useMemo(
    () =>
      pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.04],
      }),
    [pulse]
  );

  const titleOpacity = useMemo(
    () =>
      pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.92],
      }),
    [pulse]
  );

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1400&q=75"
      particleCount={22}
    >
      <AuroraBackground />
      <View style={styles.container}>
        <View
          style={[
            styles.splashCard,
            {
              backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.18 : 0.72),
              borderColor: withAlpha(colors.text, 0.14),
            },
          ]}
        >
          <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale: titleScale }], opacity: titleOpacity }}>
            <ThemedText type="title" style={styles.title}>
              ALIADO
              <ThemedText type="title" style={[styles.title, { color: colors.tint }]}>
                +50
              </ThemedText>
            </ThemedText>
          </Animated.View>

          <ThemedText style={styles.subtitle}>Cargando experiencia…</ThemedText>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: withAlpha(colors.background, 0.22),
                borderColor: withAlpha(colors.text, 0.18),
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: withAlpha(colors.tint, 0.92),
                },
              ]}
            />
          </View>

          <ThemedText style={[styles.mini, { color: withAlpha(colors.text, 0.78) }]}>
            ALIADO+50
          </ThemedText>
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  splashCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.92,
  },
  progressTrack: {
    marginTop: 10,
    width: '92%',
    height: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  mini: {
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 12,
  },
});
