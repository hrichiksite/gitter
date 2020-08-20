'use strict';

const path = require('path');
const webpack = require('webpack');
const ProvidePlugin = require('webpack/lib/ProvidePlugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const getPostcssStack = require('@gitterhq/styleguide/postcss-stack');

// Default to production unless we know for sure we are in dev
const IS_PRODUCTION = process.env.NODE_ENV !== 'dev';

const webpackConfig = {
  mode: IS_PRODUCTION ? 'production' : 'development',

  output: {
    path: path.resolve(__dirname, '../../output/assets/js/')
  },

  module: {
    strictExportPresence: true,
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: {
          test: path.resolve(__dirname, '../../node_modules'),
          exclude: [path.resolve(__dirname, '../../node_modules/gitter-realtime-client')]
        }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.hbs$/,
        loader: '@gitterhq/handlebars-loader', // disable minify for now + path.resolve(path.join(__dirname, "../../build-scripts/html-min-loader"))
        query: {
          helperDirs: [
            path.dirname(require.resolve('gitter-web-templates/shared/helpers/pluralize'))
          ],
          knownHelpers: ['cdn', 'avatarSrcSet', 'widget'],
          partialsRootRelative: path.resolve(__dirname, '../templates/partials/') + path.sep
        }
      },
      {
        test: /\.less$/,
        use: [
          { loader: 'vue-style-loader', options: { insertAt: 'top' } },
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'less-loader',
            options: {
              paths: ['public/less']
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          { loader: 'vue-style-loader', options: { insertAt: 'top' } },
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                indentedSyntax: false
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader', options: { insertAt: 'top' } },
          { loader: 'css-loader', options: { importLoaders: 1 } },
          { loader: 'postcss-loader', options: { plugins: getPostcssStack(webpack) } }
        ]
      },
      {
        test: /\.svg$/,
        loader: 'raw-loader'
      }
    ]
  },

  plugins: [
    new ProvidePlugin({ Promise: 'bluebird' }),

    new VueLoaderPlugin(),

    new ContextReplacementPlugin(
      /moment[/\\]locale$/,
      /ar|cs|da|de|en-gb|es|fa|fr|hu|it|ja|ko|lt|nl|pl|pt|ru|sk|sv|ua|zh-cn/
    )
  ]
};

if (IS_PRODUCTION) {
  webpackConfig.devtool = 'source-map';
} else {
  // See http://webpack.github.io/docs/configuration.html#devtool
  webpackConfig.devtool = 'cheap-source-map';
  webpackConfig.cache = true;
}

module.exports = webpackConfig;
