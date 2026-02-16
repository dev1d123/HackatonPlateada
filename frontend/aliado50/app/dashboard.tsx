import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/screen-background';
import { withAlpha } from '@/components/color';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ModuleItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: Parameters<typeof IconSymbol>[0]['name'];
  imageUri: string;
};

const MODULES: ModuleItem[] = [
  {
    key: 'ahorramed',
    title: 'AhorraMed',
    subtitle: 'Ahorro inteligente en medicamentos',
    icon: 'heart.fill',
    imageUri:
      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=75',
  },
  {
    key: 'legalasi',
    title: 'LegalAsi',
    subtitle: 'Guía legal clara y simple (próximamente)',
    icon: 'gavel.fill',
    imageUri:
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=75',
  },
  {
    key: 'tramiteseg',
    title: 'TramiteSeg',
    subtitle: 'Trámites y seguridad paso a paso (próximamente)',
    icon: 'verified.fill',
    imageUri:
      'https://images.unsplash.com/photo-1557992260-ec58e38d363c?auto=format&fit=crop&w=1200&q=75',
  },
];

type DrawerItem = {
  key: string;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
};

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const cardPalette = useMemo(
    () => ({
      title: colorScheme === 'light' ? withAlpha(colors.background, 0.98) : withAlpha(colors.text, 0.98),
      subtitle: colorScheme === 'light' ? withAlpha(colors.background, 0.84) : withAlpha(colors.text, 0.78),
      meta: colorScheme === 'light' ? withAlpha(colors.background, 0.72) : withAlpha(colors.text, 0.55),
    }),
    [colorScheme, colors.background, colors.text]
  );

  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = useMemo(() => Math.min(Math.max(windowWidth * 0.82, 260), 340), [windowWidth]);

  const drawerProgress = useRef(new Animated.Value(0)).current;
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openDrawer = useCallback(() => {
    setDrawerVisible(true);
    Animated.timing(drawerProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerProgress]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerVisible(false);
    });
  }, [drawerProgress]);

  useEffect(() => {
    if (!drawerVisible) {
      drawerProgress.setValue(0);
    }
  }, [drawerVisible, drawerProgress]);

  const drawerTranslateX = useMemo(
    () =>
      drawerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-drawerWidth, 0],
      }),
    [drawerProgress, drawerWidth]
  );

  const overlayOpacity = useMemo(
    () =>
      drawerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [drawerProgress]
  );

  const drawerItems: DrawerItem[] = useMemo(
    () => [
      { key: 'perfil', label: 'Perfil', disabled: true },
      { key: 'config', label: 'Configuraciones', disabled: true },
      { key: 'ayuda', label: 'Ayuda', disabled: true },
      { key: 'acerca', label: 'Acerca de', disabled: true },
      {
        key: 'logout',
        label: 'Salir de sesión',
        disabled: false,
        onPress: () => {
          closeDrawer();
          // Keep it simple: return to Login screen
          // (No auth state in this MVP)
          // Use replace to avoid coming back with back gesture.
          router.replace('/login');
        },
      },
    ],
    [closeDrawer]
  );

  return (
    <ScreenBackground
      imageUri="https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=1400&q=75"
      particleCount={16}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            onPress={openDrawer}
            style={({ pressed, hovered }) => [
              styles.menuButton,
              {
                backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
                borderColor: withAlpha(colors.text, 0.16),
              },
              pressed ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
              hovered && Platform.OS === 'web' ? { opacity: 0.94 } : null,
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
            ]}
          >
            <IconSymbol name="line.3.horizontal" size={20} color={withAlpha(colors.text, 0.9)} />
          </Pressable>

          <ThemedText type="title" style={styles.topBarTitle}>
            Dashboard
          </ThemedText>

          <View style={styles.topBarSpacer} />
        </View>

        <View
          style={[
            styles.topDivider,
            {
              backgroundColor: withAlpha(colors.text, colorScheme === 'dark' ? 0.18 : 0.14),
            },
          ]}
        />

        <View style={styles.list}>
          {MODULES.map((item) => (
            (() => {
              const enabled = item.key === 'ahorramed';
              return (
            <Pressable
              key={item.key}
              disabled={!enabled}
              accessibilityRole="button"
              onPress={enabled ? () => router.push('/ahorramed') : undefined}
              style={({ pressed, hovered }) => [
                styles.card,
                {
                  borderColor: withAlpha(colors.text, colorScheme === 'dark' ? 0.16 : 0.18),
                  // Keep base translucent so the image reads through (especially on light mode).
                  backgroundColor:
                    colorScheme === 'dark'
                      ? withAlpha(colors.background, 0.12)
                      : withAlpha(colors.text, 0.05),
                  opacity: 0.96,
                },
                enabled && pressed ? { opacity: 0.88, transform: [{ scale: 0.995 }] } : null,
                enabled && hovered && Platform.OS === 'web'
                  ? { opacity: 0.98, transform: [{ scale: 1.01 }] }
                  : null,
                Platform.OS === 'web'
                  ? ({ cursor: enabled ? 'pointer' : ('not-allowed' as any) } as any)
                  : null,
              ]}
            >
              <Image
                source={{ uri: item.imageUri }}
                contentFit="cover"
                transition={220}
                cachePolicy="memory-disk"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    // Higher opacity so the background is unmistakably visible.
                    opacity: colorScheme === 'dark' ? 0.46 : 0.62,
                  },
                ]}
              />

              <BlurView
                intensity={colorScheme === 'dark' ? 18 : 26}
                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />

              <LinearGradient
                pointerEvents="none"
                colors={
                  colorScheme === 'dark'
                    ? [
                        withAlpha(colors.background, 0.0),
                        withAlpha(colors.background, 0.40),
                        withAlpha(colors.background, 0.72),
                      ]
                    : [
                        withAlpha(colors.text, 0.0),
                        withAlpha(colors.text, 0.18),
                        withAlpha(colors.text, 0.42),
                      ]
                }
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View
                pointerEvents="none"
                style={[
                  styles.cardSheen,
                  {
                    backgroundColor: withAlpha(colors.tint, colorScheme === 'dark' ? 0.10 : 0.07),
                  },
                ]}
              />

              <View style={styles.cardLeft}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: withAlpha(colors.tint, colorScheme === 'dark' ? 0.18 : 0.14),
                      borderColor: withAlpha(colors.tint, 0.26),
                    },
                  ]}
                >
                  <IconSymbol name={item.icon} size={24} color={colors.tint} />
                </View>
                <View style={styles.textCol}>
                  <ThemedText type="subtitle" style={{ color: cardPalette.title }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: cardPalette.subtitle }]}>
                    {item.subtitle}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.cardRight}>
                <IconSymbol name="chevron.right" size={20} color={cardPalette.meta} />
              </View>
            </Pressable>
              );
            })()
          ))}
        </View>
      </View>

      {drawerVisible ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.drawerOverlay,
              {
                opacity: overlayOpacity,
                backgroundColor: withAlpha('#000000', colorScheme === 'dark' ? 0.55 : 0.35),
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú"
              onPress={closeDrawer}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View
            pointerEvents="auto"
            style={[
              styles.drawer,
              {
                width: drawerWidth,
                transform: [{ translateX: drawerTranslateX }],
                backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.78 : 0.92),
                borderColor: withAlpha(colors.text, 0.16),
              },
            ]}
          >
            <View style={styles.drawerTopRow}>
              <ThemedText type="subtitle">Menú</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar menú"
                onPress={closeDrawer}
                style={({ pressed, hovered }) => [
                  styles.drawerClose,
                  pressed ? { opacity: 0.8, transform: [{ scale: 0.98 }] } : null,
                  hovered && Platform.OS === 'web' ? { opacity: 0.9 } : null,
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                ]}
              >
                <IconSymbol name="xmark" size={18} color={withAlpha(colors.text, 0.85)} />
              </Pressable>
            </View>

            <View style={styles.drawerProfile}>
              <View style={[styles.userCircle, { backgroundColor: withAlpha(colors.tint, 0.22) }]}>
                <ThemedText type="subtitle" style={{ color: colors.tint }}>
                  U
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">Usuario demo</ThemedText>
                <ThemedText style={{ opacity: 0.75 }}>Sin backend (MVP)</ThemedText>
              </View>
            </View>

            <View style={styles.drawerList}>
              {drawerItems.map((item) => (
                <Pressable
                  key={item.key}
                  disabled={item.disabled}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!item.disabled }}
                  style={({ pressed, hovered }) => [
                    styles.drawerItem,
                    {
                      borderColor: withAlpha(colors.text, 0.12),
                      backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.72),
                      opacity: item.disabled ? 0.55 : 0.96,
                    },
                    !item.disabled && pressed ? { opacity: 0.82, transform: [{ scale: 0.995 }] } : null,
                    !item.disabled && hovered && Platform.OS === 'web' ? { opacity: 0.9 } : null,
                    Platform.OS === 'web'
                      ? ({ cursor: item.disabled ? 'not-allowed' : 'pointer' } as any)
                      : null,
                  ]}
                >
                  <ThemedText type="defaultSemiBold">{item.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      ) : null}
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
  topDivider: {
    height: 1,
    borderRadius: 999,
    marginBottom: 14,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
  },
  topBarSpacer: {
    width: 44,
    height: 44,
  },
  list: {
    flex: 1,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    left: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textCol: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
    lineHeight: 19,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  drawerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  drawerClose: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 14,
  },
  userCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerList: {
    gap: 10,
  },
  drawerItem: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
});
