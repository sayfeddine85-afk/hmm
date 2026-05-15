module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Le plugin Reanimated DOIT être listé en dernier (peer dep de victory-native).
    plugins: ['react-native-reanimated/plugin'],
  };
};
