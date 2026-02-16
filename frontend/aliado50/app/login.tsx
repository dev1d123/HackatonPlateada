import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenBackground } from '@/components/screen-background';
import { withAlpha } from '@/components/color';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const cardEnter = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    Animated.timing(cardEnter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [cardEnter, glow]);

  const cardStyle = useMemo(
    () => ({
      opacity: cardEnter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      transform: [
        {
          translateY: cardEnter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
        },
        {
          scale: cardEnter.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
        },
      ],
    }),
    [cardEnter]
  );

  const glowStyle = useMemo(
    () => ({
      opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.9] }),
      transform: [
        {
          scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.08] }),
        },
      ],
    }),
    [glow]
  );

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        borderColor: withAlpha(colors.text, 0.18),
        backgroundColor: withAlpha(colors.background, 0.12),
        color: colors.text,
        fontFamily: 'RobotoSlab_400Regular',
      },
    ],
    [colors.background, colors.text]
  );

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1520975682031-a86b2c65fd5a?auto=format&fit=crop&w=1400&q=75"
      particleCount={18}
    >
      <View style={styles.container}>
        <View style={styles.topBrand}>
          <View style={[styles.brandChip, { backgroundColor: withAlpha(colors.background, 0.35), borderColor: withAlpha(colors.text, 0.14) }]}>
            <Image
              source={{ uri: 'https://img.icons8.com/fluency/96/handshake.png' }}
              style={styles.brandLogo}
              contentFit="contain"
              transition={150}
            />
            <View style={styles.brandTextCol}>
              <ThemedText style={[styles.brandName, { color: colors.text }]}>ALIADO</ThemedText>
              <ThemedText style={[styles.brandName, { color: colors.tint }]}>+50</ThemedText>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.82),
              borderColor: withAlpha(colors.text, 0.16),
            },
          ]}
        >
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Iniciar sesión
            </ThemedText>
          </ThemedView>

          <View style={styles.form}>
            <ThemedText type="subtitle">Correo</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="tu-correo@ejemplo.com"
              placeholderTextColor={withAlpha(colors.text, 0.45)}
              style={inputStyle}
            />

            <ThemedText type="subtitle" style={{ marginTop: 10 }}>
              Contraseña
            </ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={withAlpha(colors.text, 0.45)}
              style={inputStyle}
            />

            <Pressable
              disabled
              accessibilityRole="button"
              style={({ pressed, hovered }) => [
                styles.primaryButton,
                {
                  backgroundColor: withAlpha(colors.tint, 0.95),
                  opacity: 0.5,
                },
                pressed && Platform.OS === 'web' ? { transform: [{ scale: 0.99 }] } : null,
                hovered && Platform.OS === 'web' ? { opacity: 0.55 } : null,
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>Iniciar sesión</ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        <View style={styles.bottom}>
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: withAlpha(colors.text, 0.18) }]} />
            <ThemedText style={styles.dividerText}>o</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: withAlpha(colors.text, 0.18) }]} />
          </View>

          <View style={styles.demoWrap}>
            <Animated.View
              style={[
                styles.demoGlow,
                glowStyle,
                {
                  backgroundColor: withAlpha(colors.tint, 0.22),
                },
              ]}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/dashboard')}
              style={({ pressed, hovered }) => [
                styles.secondaryButton,
                {
                  borderColor: withAlpha(colors.tint, 0.95),
                  backgroundColor: withAlpha(colors.background, 0.25),
                },
                pressed ? { transform: [{ scale: 0.99 }], opacity: 0.95 } : null,
                hovered && Platform.OS === 'web' ? { transform: [{ scale: 1.01 }], opacity: 0.98 } : null,
                Platform.OS === 'web' ? { cursor: 'pointer' as any } : null,
              ]}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: colors.tint }]}>
                Modo demo
              </ThemedText>
            </Pressable>
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
    paddingTop: 54,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topBrand: {
    alignItems: 'center',
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandTextCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  header: {
    gap: 6,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
  },
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  bottom: {
    gap: 10,
  },
  demoWrap: {
    position: 'relative',
  },
  demoGlow: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 6,
    bottom: 6,
    borderRadius: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    opacity: 0.75,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
  },
});
