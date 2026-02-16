import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';

import {
  RobotoSlab_400Regular,
  RobotoSlab_600SemiBold,
  RobotoSlab_700Bold,
  useFonts,
} from '@expo-google-fonts/roboto-slab';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    RobotoSlab_400Regular,
    RobotoSlab_600SemiBold,
    RobotoSlab_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Apply a sensible default for any plain <Text> / <TextInput> usage.
      // (ThemedText still controls weights via specific font variants.)
      Text.defaultProps = Text.defaultProps ?? {};
      Text.defaultProps.style = [{ fontFamily: 'RobotoSlab_400Regular' }, Text.defaultProps.style];

      TextInput.defaultProps = TextInput.defaultProps ?? {};
      TextInput.defaultProps.style = [
        { fontFamily: 'RobotoSlab_400Regular' },
        TextInput.defaultProps.style,
      ];

      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="ahorramed" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
