'use strict';

const _ = require('lodash');
const cdn = require('gitter-web-cdn');

function cdnUrlGenerator(url, options = {}) {
  if (options.root) {
    return options.root + url;
  }

  return cdn(url, {});
}

let webpackBuildManifest;
function generateAssetsForChunks(chunks /*, options*/) {
  // We have this loaded just in time so we can wait for the initial Gitter boot-up that creates the manifest
  try {
    webpackBuildManifest =
      // eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
      webpackBuildManifest || require('../../../output/assets/js/webpack-manifest.json');
  } catch (err) {
    throw new Error(
      `You probably need to wait for the Gitter webpack build to finish. Error occurred while requiring \`output/assets/js/webpack-manifest.json\`: ${err}\n${err.stack}`
    );
  }

  const defaultAssets = webpackBuildManifest.entrypoints.default.assets || [];

  const entryAssets = chunks.reduce((entryAssets, chunkName) => {
    const entryPoint = webpackBuildManifest.entrypoints[chunkName];
    return entryAssets.concat((entryPoint && entryPoint.assets) || []);
  }, []);

  const assets = Object.keys(
    defaultAssets
      .concat(entryAssets)
      .filter(asset => !/.*\.map$/.test(asset))
      .reduce((assetMap, asset) => {
        assetMap[asset] = true;
        return assetMap;
      }, {})
  );

  return assets;
}

const bootScriptHelper = _.memoize(
  function(/*[...chunks, parameters]*/) {
    const chunks = [].slice.call(arguments, 0, -1);
    const parameters = [].slice.call(arguments, -1)[0];

    const options = parameters.hash;
    const jsRoot = (options && options.jsRoot) || 'js';

    const assets = generateAssetsForChunks(chunks, options);

    const baseUrl = cdnUrlGenerator(jsRoot + '/', options);
    const chunkScriptList = assets.map(asset => {
      const cdnUrl = cdnUrlGenerator(`${jsRoot}/${asset}`, options);
      return `<script type="text/javascript" src="${cdnUrl}"></script>`;
    });

    return `
    <script type="text/javascript">window.webpackPublicPath = '${baseUrl}';</script>
    ${chunkScriptList.join('\n')}
  `;
  },
  // This is memoize resolver key function that supports multiple arguments
  // Because we support multiple chunks spread across the parameters
  (...args) => {
    const chunks = [].slice.call(args, 0, -1);
    return JSON.stringify(chunks);
  }
);

module.exports = {
  generateAssetsForChunks,
  bootScriptHelper
};
