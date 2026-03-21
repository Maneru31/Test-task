// В test-окружении dynamic import() не компилируется @react-native/babel-preset → require(),
// что ломает jest.mock для динамических импортов. Этот плагин делает замену вручную.
function dynamicImportToRequire({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        if (t.isImport(path.node.callee)) {
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
              [t.callExpression(t.identifier('require'), path.node.arguments)],
            ),
          );
        }
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // В test-окружении компилируем import() → Promise.resolve(require()) (INV-03 совместимость)
    ...(process.env.NODE_ENV === 'test' ? [dynamicImportToRequire] : []),
    'react-native-reanimated/plugin', // ДОЛЖЕН БЫТЬ ПОСЛЕДНИМ (INV-10)
  ],
};
