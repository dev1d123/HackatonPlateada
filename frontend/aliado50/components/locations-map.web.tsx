import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';

import { withAlpha } from '@/components/color';
import { LocationPoint } from '@/components/locations-map.types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Fix default marker icons for bundlers (otherwise markers may not render).
const markerIcon2x = require('leaflet/dist/images/marker-icon-2x.png');
const markerIcon = require('leaflet/dist/images/marker-icon.png');
const markerShadow = require('leaflet/dist/images/marker-shadow.png');

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x?.default ?? markerIcon2x,
  iconUrl: markerIcon?.default ?? markerIcon,
  shadowUrl: markerShadow?.default ?? markerShadow,
});

function FitBounds({ locations }: { locations: LocationPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) return;
    const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [locations, map]);

  return null;
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

  const center = useMemo(() => {
    if (!locations.length) return { lat: -12.0464, lng: -77.0428 };
    return { lat: locations[0].lat, lng: locations[0].lng };
  }, [locations]);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.mapFrame,
          {
            borderColor: withAlpha(colors.text, 0.16),
            backgroundColor: withAlpha(colors.background, colorScheme === 'dark' ? 0.22 : 0.78),
          },
        ]}
      >
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom
          style={styles.map as any}
          attributionControl={false}
        >
          <TileLayer
            // OpenStreetMap tiles
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds locations={locations} />

          {locations.map((loc) => {
            const selected = selectedId === loc.id;
            const icon = selected
              ? new L.Icon.Default({
                  className: 'selected-marker',
                })
              : new L.Icon.Default();

            return (
              <Marker
                key={loc.id}
                position={[loc.lat, loc.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelect(loc.id),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  {loc.nombre}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </View>

      {Platform.OS === 'web' ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  mapFrame: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: 260,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
