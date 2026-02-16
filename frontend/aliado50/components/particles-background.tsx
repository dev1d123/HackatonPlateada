import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Particle = {
  key: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  drift: number;
  duration: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ParticlesBackground({ count = 22 }: { count?: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const dotColor = Colors[colorScheme].tint;

  const { width, height } = Dimensions.get('window');

  const rand = useMemo(() => mulberry32(50), []);
  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: count }).map((_, idx) => {
      const size = 2 + Math.round(rand() * 4);
      return {
        key: `p-${idx}`,
        x: rand() * width,
        y: rand() * height,
        size,
        opacity: 0.18 + rand() * 0.25,
        drift: (rand() - 0.5) * 26,
        duration: 3800 + rand() * 4200,
      };
    });
  }, [count, height, rand, width]);

  const anim = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anim.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, {
            toValue: 1,
            duration: particles[i].duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(a, {
            toValue: 0,
            duration: particles[i].duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anim, particles]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, idx) => {
        const translateY = anim[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -18 - p.size * 1.2],
        });
        const translateX = anim[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });

        return (
          <Animated.View
            key={p.key}
            style={[
              styles.dot,
              {
                backgroundColor: dotColor,
                width: p.size,
                height: p.size,
                borderRadius: p.size,
                opacity: p.opacity,
                transform: [{ translateX }, { translateY }],
                left: p.x,
                top: p.y,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
  },
});
