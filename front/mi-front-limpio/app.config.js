module.exports = ({ config }) => ({
  ...config,

  plugins: [...(config.plugins || []), "expo-status-bar"],

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
