import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { withAlpha } from '@/components/color';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { LocationPoint } from '@/components/locations-map.types';

function buildLeafletHtml({
  locations,
  selectedId,
  colorScheme,
  tint,
}: {
  locations: LocationPoint[];
  selectedId: string | null;
  colorScheme: 'light' | 'dark';
  tint: string;
}) {
  const locs = locations.map((l) => ({
    id: String(l.id),
    nombre: String(l.nombre),
    lat: Number(l.lat),
    lng: Number(l.lng),
    direccion: String(l.direccion),
  }));

  const safeSelected = selectedId ? String(selectedId) : '';
  const bg = colorScheme === 'dark' ? '#0B0F1A' : '#F7F8FC';
  const panel = colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const text = colorScheme === 'dark' ? 'rgba(255,255,255,0.86)' : 'rgba(0,0,0,0.76)';

  // NOTE: Using CDN to keep the WebView self-contained.
  const lines: string[] = [];
  lines.push('<!doctype html>');
  lines.push('<html>');
  lines.push('  <head>');
  lines.push('    <meta charset="utf-8" />');
  lines.push('    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />');
  lines.push('    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />');
  lines.push('    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>');
  lines.push('    <style>');
  lines.push('      html, body { height: 100%; width: 100%; margin: 0; background: ' + bg + '; }');
  lines.push('      #map { height: 100%; width: 100%; }');
  lines.push('      .hint {');
  lines.push('        position: absolute; left: 10px; right: 10px; bottom: 10px;');
  lines.push('        background: ' + panel + '; color: ' + text + ';');
  lines.push('        border-radius: 12px; padding: 10px 12px;');
  lines.push('        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial;');
  lines.push('        font-size: 12px; line-height: 16px;');
  lines.push('        backdrop-filter: blur(10px);');
  lines.push('      }');
  lines.push('      .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,0.12); margin-right: 6px; }');
  lines.push('      .selected-dot { width: 10px; height: 10px; border-radius: 10px; background: ' + tint + '; box-shadow: 0 0 0 6px rgba(0,0,0,0.18); border: 2px solid rgba(255,255,255,0.85); }');
  lines.push('      .dot { width: 10px; height: 10px; border-radius: 10px; background: rgba(255,255,255,0.92); border: 2px solid rgba(0,0,0,0.15); }');
  lines.push('    </style>');
  lines.push('  </head>');
  lines.push('  <body>');
  lines.push('    <div id="map"></div>');
  lines.push('    <div class="hint"><span class="pill">Demo</span> Toca un marcador para seleccionar la ubicación.</div>');
  lines.push('    <script>');
  lines.push('      function post(msg) { try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {} }');
  lines.push('      window.addEventListener("error", function (e) { post({ type: "error", message: String(e && e.message ? e.message : e) }); });');
  lines.push('      window.addEventListener("unhandledrejection", function (e) { post({ type: "error", message: "Unhandled promise rejection" }); });');
  lines.push('      const LOCS = ' + JSON.stringify(locs) + ';');
  lines.push('      const initialSelected = ' + JSON.stringify(safeSelected) + ';');
  lines.push('      if (typeof L === "undefined") {');
  lines.push('        post({ type: "error", message: "Leaflet no cargó (CDN bloqueado o sin internet)." });');
  lines.push('      }');
  lines.push('      const map = (typeof L !== "undefined") ? L.map("map", { zoomControl: true, attributionControl: false }) : null;');
  lines.push('      if (map) {');
  lines.push('        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);');
  lines.push('      }');
  lines.push('      const markersById = {};');
  lines.push('      function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/\'/g, "&#39;"); }');
  lines.push('      function makeIcon(isSelected) { return L.divIcon({ className: "", html: "<div class=\\\"" + (isSelected ? "selected-dot" : "dot") + "\\\"></div>", iconSize: [14, 14], iconAnchor: [7, 7] }); }');
  lines.push('      function setSelected(id) { Object.keys(markersById).forEach(function (k) { markersById[k].setIcon(makeIcon(k === id)); }); }');
  lines.push('      if (!map) { /* stop here */ }');
  lines.push('      if (LOCS.length) {');
  lines.push('        const bounds = L.latLngBounds(LOCS.map(function (l) { return [l.lat, l.lng]; }));');
  lines.push('        map.fitBounds(bounds, { padding: [24, 24] });');
  lines.push('      } else {');
  lines.push('        map.setView([-12.0464, -77.0428], 13);');
  lines.push('      }');
  // Leaflet inside modals often needs invalidateSize.
  lines.push('      setTimeout(function () { try { map.invalidateSize(true); } catch (e) {} }, 60);');
  lines.push('      setTimeout(function () { try { map.invalidateSize(true); } catch (e) {} }, 260);');
  lines.push('      LOCS.forEach(function (loc) {');
  lines.push('        const marker = L.marker([loc.lat, loc.lng], { icon: makeIcon(loc.id === initialSelected) }).addTo(map);');
  lines.push('        marker.bindPopup("<b>" + esc(loc.nombre) + "</b><br/>" + esc(loc.direccion));');
  lines.push('        marker.on("click", function () { setSelected(loc.id); post({ type: "select", id: loc.id }); });');
  lines.push('        markersById[loc.id] = marker;');
  lines.push('      });');
  lines.push('      document.addEventListener("message", function (e) { try { const data = JSON.parse(e.data); if (data.type === "select" && typeof data.id === "string") setSelected(data.id); } catch (err) {} });');
  lines.push('      window.addEventListener("message", function (e) { try { const data = JSON.parse(e.data); if (data.type === "select" && typeof data.id === "string") setSelected(data.id); } catch (err) {} });');
  lines.push('    </script>');
  lines.push('  </body>');
  lines.push('</html>');
  return lines.join('\n');
}

function metersToKmLabel(meters: number) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function LocationsMap({
  locations,
  selectedId,
  onSelect,
}: {
  locations: LocationPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const webViewRef = useRef(null) as unknown as { current: WebView | null };
  const [webViewError, setWebViewError] = useState<string | null>(null);

  const html = useMemo(
    () =>
      buildLeafletHtml({
        locations,
        selectedId,
        colorScheme,
        tint: colors.tint,
      }),
    [locations, selectedId, colorScheme, colors.tint]
  );

  useEffect(() => {
    if (!selectedId) return;
    // Keep map selection in sync when selection is made outside the map.
    const msg = JSON.stringify({ type: 'select', id: selectedId });
    webViewRef.current?.postMessage(msg);
  }, [selectedId]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'select' && typeof data.id === 'string') {
          setWebViewError(null);
          onSelect(data.id);
        }
        if (data?.type === 'error' && typeof data.message === 'string') {
          setWebViewError(data.message);
        }
      } catch {
        // ignore
      }
    },
    [onSelect]
  );

  // If WebView fails (CDN blocked / no internet), show a selectable list so the flow keeps working.
  if (webViewError) {
    const cardBg = withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78);
    const border = withAlpha(colors.text, 0.16);
    return (
      <View style={styles.fallbackWrap}>
        <View style={[styles.fallbackBanner, { backgroundColor: cardBg, borderColor: border }]}
        >
          <ThemedText type="defaultSemiBold">Mapa no disponible</ThemedText>
          <ThemedText style={{ opacity: 0.8 }}>{webViewError}</ThemedText>
          <ThemedText style={{ opacity: 0.75 }}>
            Mostrando lista de ubicaciones (demo).
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.fallbackList} showsVerticalScrollIndicator={false}>
          {locations.map((loc) => {
            const selected = loc.id === selectedId;
            return (
              <Pressable
                key={loc.id}
                onPress={() => onSelect(loc.id)}
                style={({ pressed, hovered }) => [
                  styles.locCard,
                  { backgroundColor: cardBg, borderColor: selected ? withAlpha(colors.tint, 0.65) : border },
                  pressed ? { opacity: 0.9 } : null,
                  hovered && Platform.OS === 'web' ? { opacity: 0.96 } : null,
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                ]}
              >
                <View style={styles.locTop}>
                  <ThemedText type="defaultSemiBold">{loc.nombre}</ThemedText>
                  <ThemedText style={{ opacity: 0.78 }}>{metersToKmLabel(loc.distanciaMetros)}</ThemedText>
                </View>
                <ThemedText style={{ opacity: 0.86 }}>📍 {loc.direccion}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.mapFrame,
        {
          borderColor: withAlpha(colors.text, 0.16),
          backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
        },
      ]}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        onError={() => setWebViewError('WebView no pudo cargar el contenido.')}
        onHttpError={() => setWebViewError('WebView recibió un error HTTP.')}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        // Keep gestures smooth inside modal
        scrollEnabled
        // iOS/Android both
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackWrap: {
    width: '100%',
    gap: 10,
  },
  fallbackBanner: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  fallbackList: {
    gap: 10,
    paddingBottom: 6,
  },
  locCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  locTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapFrame: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: 260,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
