'use strict';

var path = require('path');

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

var config = {
  mode: IS_PRODUCTION ? 'production' : 'development',
  entry: {
    sw: require.resolve('./service-worker/sw')
  },
  output: {
    path: path.resolve(__dirname, './output/assets/'),
    filename: '[name].js',
    chunkFilename: '[id].chunk.js',
    publicPath: '/',
    devtoolModuleFilenameTemplate: '[resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[resource-path]?[hash]'
  },
  bail: true
};

module.exports = config;
