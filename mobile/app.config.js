// Dynamic Expo config — wraps the static app.json so the Android Google Maps
// API key can be injected at build time from an environment variable instead
// of being committed. Expo loads app.json first and passes it here as `config`;
// we override only the Maps key, leaving everything else untouched.
//
// The real key is NEVER stored in the repo. Supply it via an EAS environment
// variable named GOOGLE_MAPS_ANDROID_KEY (set per build profile), e.g.:
//   eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <key> --environment preview
//   eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <key> --environment production
// For a local dev build, export it in your shell before `npm run android`.
//
// When the env var is absent (most local runs) the app.json placeholder is
// kept, so the config still resolves — Android maps simply stay blank, which
// is the documented v1 behaviour.

module.exports = ({ config }) => {
  const apiKey =
    process.env.GOOGLE_MAPS_ANDROID_KEY ??
    config.android?.config?.googleMaps?.apiKey;

  return {
    ...config,
    // Register native config plugins on top of whatever app.json declares.
    // @react-native-community/datetimepicker (system month/year picker on the
    // Events calendar) ships a plugin for its Android theming/locale.
    plugins: [...(config.plugins ?? []), "@react-native-community/datetimepicker"],
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey,
        },
      },
    },
  };
};
