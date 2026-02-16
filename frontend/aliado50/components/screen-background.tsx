import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { withAlpha } from '@/components/color';
import { ParticlesBackground } from '@/components/particles-background';

export function ScreenBackground({
  imageUri,
  particleCount = 18,
  children,
  style,
  ...rest
}: ViewProps & { imageUri: string; particleCount?: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const overlayColors =
    colorScheme === 'dark'
      ? [withAlpha(colors.background, 0.12), withAlpha(colors.text, 0.32)]
      : [withAlpha(colors.background, 0.62), withAlpha(colors.tint, 0.14)];

  return (
    <View style={[styles.root, style]} {...rest}>
      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />

      <LinearGradient
        colors={overlayColors}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ParticlesBackground count={particleCount} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
});
