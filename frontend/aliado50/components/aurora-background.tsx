import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { withAlpha } from '@/components/color';

export function AuroraBackground() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const l1 = makeLoop(a1, 3600, 0);
    const l2 = makeLoop(a2, 4200, 180);
    const l3 = makeLoop(a3, 4800, 320);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a1, a2, a3]);

  const t1 = useMemo(
    () =>
      a1.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [a1]
  );
  const t2 = useMemo(
    () =>
      a2.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [a2]
  );
  const t3 = useMemo(
    () =>
      a3.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [a3]
  );

  const blob1 = {
    transform: [
      {
        translateX: Animated.multiply(
          t1.interpolate({ inputRange: [0, 1], outputRange: [-80, 90] }),
          1
        ),
      },
      {
        translateY: Animated.multiply(
          t1.interpolate({ inputRange: [0, 1], outputRange: [70, -60] }),
          1
        ),
      },
      {
        scale: t1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }),
      },
    ],
  };

  const blob2 = {
    transform: [
      {
        translateX: t2.interpolate({ inputRange: [0, 1], outputRange: [95, -110] }) as any,
      },
      {
        translateY: t2.interpolate({ inputRange: [0, 1], outputRange: [-45, 80] }) as any,
      },
      {
        scale: t2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }),
      },
    ],
  };

  const blob3 = {
    transform: [
      {
        translateX: t3.interpolate({ inputRange: [0, 1], outputRange: [-35, 45] }) as any,
      },
      {
        translateY: t3.interpolate({ inputRange: [0, 1], outputRange: [-95, -15] }) as any,
      },
      {
        scale: t3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }),
      },
    ],
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.blob, styles.blob1, blob1]}>
        <LinearGradient
          colors={[withAlpha(colors.tint, 0.68), withAlpha(colors.background, 0.0)]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.blob, styles.blob2, blob2]}>
        <LinearGradient
          colors={[withAlpha(colors.tint, 0.46), withAlpha(colors.background, 0.0)]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.blob, styles.blob3, blob3]}>
        <LinearGradient
          colors={[withAlpha(colors.tint, 0.52), withAlpha(colors.background, 0.0)]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  blob1: {
    width: 560,
    height: 560,
    left: -140,
    top: -180,
  },
  blob2: {
    width: 560,
    height: 560,
    right: -170,
    top: -40,
  },
  blob3: {
    width: 520,
    height: 520,
    left: -90,
    bottom: -220,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
});
