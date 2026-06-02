// Federation map — a platform-split abstraction so each OS uses a *keyless*
// native map, and the screen above never has to care which engine is underneath.
//
//   • iOS     → react-native-maps (Apple Maps). No API key required.
//   • Android → MapLibre + OpenStreetMap raster tiles. No Google key required.
//
// Why the split: react-native-maps on Android is Google Maps under the hood,
// which needs a *billed* Google Maps API key. MapLibre renders OSM tiles with no
// key, so the Android map works on every build out of the box. iOS already gets
// Apple Maps for free, so it keeps the module it always used.
//
// IMPORTANT — why the native libraries are loaded with `require()` behind a
// guard rather than a top-level `import`:
//   MapLibre's components touch the `MLRNCameraModule` TurboModule the moment
//   their JS evaluates. A static top-level import therefore *crashes the whole
//   app at startup* ("[runtime not ready]: ... 'MLRNCameraModule' could not be
//   found") on any binary that doesn't contain the native module — a stale
//   install, Expo Go, or simply before a native rebuild. To make that
//   impossible, we (a) only ever evaluate MapLibre on Android, (b) only when
//   `TurboModuleRegistry.get` confirms the native module is actually linked into
//   the running binary, and (c) fall back to a plain placeholder otherwise. The
//   map still REQUIRES a native build to render — but a missing module now
//   degrades to a placeholder instead of taking the entire app down.
//
// Type-only imports below are erased at compile time, so they never trigger the
// native module — only the `require()`s inside the factories do.
//
// NOTE: OpenStreetMap's public tile server is fine for low-traffic apps but its
// usage policy discourages heavy/bulk use. If usage grows, point OSM_STYLE at a
// proper tile provider (MapTiler / Stadia free tier, or self-hosted).

import React from "react";
import {
  Platform,
  Text,
  TurboModuleRegistry,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type RNMapView from "react-native-maps";
import type {
  CameraRef,
  StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { themes } from "@tokens";

/** The slice of react-native-maps' region shape the screen drives the map with. */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type FederationPin = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  description: string;
};

/** Imperative handle — intentionally matches `MapView.animateToRegion`. */
export type FederationMapHandle = {
  animateToRegion: (region: MapRegion, duration: number) => void;
};

type Props = {
  initialRegion: MapRegion;
  pins: FederationPin[];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  onPinPress: (id: number) => void;
};

type MapComponent = React.ForwardRefExoticComponent<
  Props & React.RefAttributes<FederationMapHandle>
>;

// ─── Fallback — shown only when no native map engine is available ───────────
// (e.g. running JS against a binary that wasn't rebuilt with the map module).

const FallbackMap = React.forwardRef<FederationMapHandle, Props>(
  function FallbackMap({ style, accessibilityLabel }, ref) {
    React.useImperativeHandle(ref, () => ({ animateToRegion: () => {} }), []);
    const t = themes.light;
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surface.subtle,
          },
          style,
        ]}
      >
        <Text style={{ color: t.text.muted, fontSize: 13 }}>
          Carte indisponible
        </Text>
      </View>
    );
  },
);

// ─── iOS: Apple Maps via react-native-maps ──────────────────────────────────

function createAppleMap(): MapComponent {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNMaps = require("react-native-maps");
  const MapView = RNMaps.default as typeof import("react-native-maps").default;
  const Marker = RNMaps.Marker as typeof import("react-native-maps").Marker;

  return React.forwardRef<FederationMapHandle, Props>(function AppleMap(
    { initialRegion, pins, style, accessibilityLabel, onPinPress },
    ref,
  ) {
    const mapRef = React.useRef<RNMapView>(null);
    React.useImperativeHandle(
      ref,
      () => ({
        animateToRegion: (region, duration) =>
          mapRef.current?.animateToRegion(region, duration),
      }),
      [],
    );

    return (
      <MapView
        ref={mapRef}
        style={style}
        initialRegion={initialRegion}
        accessibilityLabel={accessibilityLabel}
      >
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
            description={p.description}
            onPress={() => onPinPress(p.id)}
          />
        ))}
      </MapView>
    );
  });
}

// ─── Android: MapLibre + OpenStreetMap raster tiles ─────────────────────────

// Minimal MapLibre style: one OSM raster source + layer. Cast through unknown
// because an inline literal widens "raster"/8 away from the spec's literals.
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
} as unknown as StyleSpecification;

// react-native-maps thinks in (center, latitudeDelta); MapLibre thinks in
// (center, zoom). At the equator a full 360° span is zoom 0, halving the span
// each level — good enough for our country/region framing.
const regionToZoom = (region: MapRegion) =>
  Math.log2(360 / region.longitudeDelta);

function createMapLibreMap(): MapComponent {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const MapLibre = require("@maplibre/maplibre-react-native");
  const MapLibreMap = MapLibre.Map;
  const Camera = MapLibre.Camera;
  const GeoJSONSource = MapLibre.GeoJSONSource;
  const Layer = MapLibre.Layer;

  return React.forwardRef<FederationMapHandle, Props>(function AndroidMap(
    { initialRegion, pins, style, accessibilityLabel, onPinPress },
    ref,
  ) {
    const cameraRef = React.useRef<CameraRef>(null);
    React.useImperativeHandle(
      ref,
      () => ({
        animateToRegion: (region, duration) => {
          const center: [number, number] = [region.longitude, region.latitude];
          const zoom = regionToZoom(region);
          // duration 0 (reduced motion) → snap, otherwise ease like Apple Maps.
          if (duration > 0) cameraRef.current?.easeTo({ center, zoom, duration });
          else cameraRef.current?.jumpTo({ center, zoom });
        },
      }),
      [],
    );

    // One GeoJSON point per pin, rendered as GPU circles — scales to hundreds of
    // pins without the per-marker native views a Marker-per-pin would create.
    const data = React.useMemo<GeoJSON.FeatureCollection>(
      () => ({
        type: "FeatureCollection",
        features: pins.map((p) => ({
          type: "Feature",
          id: p.id,
          properties: { id: p.id },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      }),
      [pins],
    );

    return (
      <MapLibreMap
        style={style}
        mapStyle={OSM_STYLE}
        logo={false}
        attribution
        accessibilityLabel={accessibilityLabel}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialRegion.longitude, initialRegion.latitude],
            zoom: regionToZoom(initialRegion),
          }}
        />
        <GeoJSONSource
          id="federations"
          data={data}
          onPress={(e: { nativeEvent: { features?: GeoJSON.Feature[] } }) => {
            const id = e.nativeEvent.features?.[0]?.properties?.id;
            if (typeof id === "number") onPinPress(id);
          }}
        >
          <Layer
            id="federation-pins"
            type="circle"
            source="federations"
            paint={{
              "circle-radius": 7,
              "circle-color": themes.light.brand.accent,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 2,
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>
    );
  });
}

// Choose the implementation once, defensively. MapLibre is only touched on
// Android AND only when its TurboModule is actually present in the binary —
// `.get()` (unlike `.getEnforcing()`) returns null instead of throwing.
function pickImplementation(): MapComponent {
  if (Platform.OS === "ios") return createAppleMap();
  if (
    Platform.OS === "android" &&
    TurboModuleRegistry.get("MLRNCameraModule") != null
  ) {
    return createMapLibreMap();
  }
  return FallbackMap;
}

export const FederationMap: MapComponent = pickImplementation();
