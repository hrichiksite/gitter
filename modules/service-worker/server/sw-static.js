'use strict';

var path = require('path');
var fs = require('fs');

function createStatic() {
  var staticDir = path.join(__dirname, '..', 'output', 'assets');
  var staticFile = path.join(staticDir, 'sw.js');

  if (!fs.existsSync(staticFile)) {
    throw new Error('Cannot resolve service worker: ' + staticFile);
  }

  return function(req, res, next) {
    var options = {
      dotfiles: 'deny',
      headers: {
        // Headers go here
      }
    };

    res.sendFile(staticFile, options, function(err) {
      if (err) return next(err);
    });
  };
}

function install(app) {
  if (
    process.env.NODE_ENV === 'dev' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'test-docker'
  ) {
    app.use('/', require('../dev/webpack-middleware').create());
  } else {
    app.get('/sw.js', createStatic());
  }
}

module.exports = {
  install: install
};
