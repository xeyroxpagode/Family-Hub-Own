module.exports = ({ config }) => ({
  ...config,

  plugins: [...(config.plugins || []), "expo-status-bar", "expo-video", ["expo-audio", {
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
