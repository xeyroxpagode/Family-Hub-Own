module.exports = ({ config }) => ({
  ...config,

  // `react-native-pdf` (+ its `react-native-blob-util` peer) are the Stage 2 Slice C
  // inline PDF renderer. Both need their out-of-tree Expo config plugins so `expo
  // prebuild` / `expo run:*` wires the native module; without them a fresh native
  // build would not autolink and the Viewer would fall back to the system hand-off.
  // The decision, its evidence and its honest limits are recorded in
  // `docs/homecloud/HOMECLOUD_FILES_STAGE2_PDF_RENDERER_DECISION.md`.
  plugins: [...(config.plugins || []), "expo-status-bar", "expo-video", "expo-sharing", "react-native-blob-util", "@config-plugins/react-native-pdf", ["expo-audio", {
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
