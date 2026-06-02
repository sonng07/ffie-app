// React Native autolinking overrides.
//
// MapLibre is Android-only here: per FederationMap, iOS uses Apple Maps via
// react-native-maps and never evaluates MapLibre at runtime (it's loaded behind
// a Platform + TurboModuleRegistry guard on Android only). But CocoaPods still
// tried to COMPILE @maplibre/maplibre-react-native into the iOS target, where
// its MapLibre xcframework header (`MapLibre/MLNNetworkConfiguration.h`) fails
// to resolve and breaks `expo run:ios`. Excluding it from iOS autolinking keeps
// the iOS build clean while Android keeps the native MapLibre engine.
module.exports = {
  dependencies: {
    "@maplibre/maplibre-react-native": {
      platforms: { ios: null },
    },
  },
};
