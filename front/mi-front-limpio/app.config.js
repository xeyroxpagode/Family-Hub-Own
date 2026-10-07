module.exports = ({ config }) => ({
  ...config,

  // HomeCloud PDF Viewer is Expo-Go-compatible: a locally bundled pdf.js engine in
  // a locked-down WebView (`react-native-webview`, which ships inside Expo Go),
  // so NO custom native PDF module and NO out-of-tree config plugin is needed.
  // `react-native-webview` needs no plugin entry: it autolinks and its native
  // code is already present in Expo Go / the SDK 57 client.
  plugins: [...(config.plugins || []), "expo-status-bar", "expo-video", "expo-sharing", ["expo-audio", {
    microphonePermission: "HomePlus necesita acceso al micrófono para grabar recuerdos de audio."
  }]],

  android: {
    ...config.android,

    config: {
      ...config.android?.config,

      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
