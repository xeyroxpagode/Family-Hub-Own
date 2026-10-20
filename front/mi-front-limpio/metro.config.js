const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Base Expo SDK 57 Metro configuration.
const config = getDefaultConfig(__dirname);

// Web-only resolution stub for `react-native-maps`: the native maps stack
// cannot load in a browser bundle (its fabric specs call codegenNativeComponent,
// which react-native-web does not export, and the whole web bundle dies at
// startup). On web we resolve the package to a no-op stub; native platforms
// keep the real library untouched.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'web', 'react-native-maps-stub.js'),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
