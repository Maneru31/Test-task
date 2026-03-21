const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
  resolver: {
    extraNodeModules: {
      // Stub react-native-config: no .env in CI, all values have fallbacks
      'react-native-config': path.resolve(__dirname, 'src/stubs/reactNativeConfig.js'),
    },
    resolveRequest: (context, moduleName, platform) => {
      // Resolve @/ alias → src/ (mirrors tsconfig.json paths)
      if (moduleName.startsWith('@/')) {
        return context.resolveRequest(
          context,
          path.resolve(__dirname, 'src', moduleName.slice(2)),
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
