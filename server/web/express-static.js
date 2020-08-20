'use strict';

exports.install = function(app) {
  var express = require('express');
  var resolveStatic = require('./resolve-static');
  var favicon = require('serve-favicon');

  var webpackMiddleware = require('webpack-dev-middleware'); // eslint-disable-line node/no-unpublished-require
  var webpack = require('webpack'); // eslint-disable-line node/no-unpublished-require

  app.use(
    webpackMiddleware(webpack(require('../../public/js/webpack.config')), {
      logLevel: 'warn',
      lazy: false,
      watchOptions: {
        aggregateTimeout: 400
      },
      publicPath: '/_s/l/js/',
      writeToDisk: filePath => {
        // We use the `webpack-manifest.json` in `hbs-helpers`
        // to determine which dynamic/dependent chunks to serve
        return /webpack-manifest\.json$/.test(filePath);
      },
      stats: {
        colors: true
      }
    })
  );

  app.use(
    '/_s/l/styles',
    express.static('output/assets/styles', {
      maxAge: 0
    })
  );

  var staticServer = express.static(resolveStatic(), {
    maxAge: 0
  });

  app.use('/_s/lt/:cacheBuster', staticServer);
  app.use('/_s/l', staticServer);

  app.use(favicon(resolveStatic('favicon.ico')));
};
