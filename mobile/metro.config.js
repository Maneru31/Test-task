const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// react-native-config requires a native module and a .env file.
// Since neither is available in CI/Appetize builds, we stub it out.
// All usages already have fallback values (Config.X ?? 'hardcoded').
const config = {
  resolver: {
    extraNodeModules: {
      'react-native-config': path.resolve(__dirname, 'src/stubs/reactNativeConfig.js'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
