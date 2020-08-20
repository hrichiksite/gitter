'use strict';

const presets = ['@babel/preset-env'];
const plugins = ['@babel/plugin-transform-runtime'];

// Jest is running in node environment, so we need additional plugins
const isJest = !!process.env.JEST_WORKER_ID;
if (isJest) {
  plugins.push('@babel/plugin-transform-modules-commonjs');
}

module.exports = {
  sourceType: 'unambiguous', // supports mixing commonjs and es modules https://github.com/webpack/webpack/issues/4039#issuecomment-498033015
  plugins,
  presets
};
