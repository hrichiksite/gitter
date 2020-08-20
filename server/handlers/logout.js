'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var identifyRoute = env.middlewares.identifyRoute;
var express = require('express');
var logout = require('../web/middlewares/logout');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/', identifyRoute('logout'), function(req, res, next) {
  next(405);
});

router.post('/', identifyRoute('logout-post'), logout, function(req, res) {
  res.format({
    text: function() {
      res.send('OK');
    },

    html: function() {
      res.relativeRedirect(nconf.get('web:homeurl'));
    },

    json: function() {
      res.send({ success: true, redirect: nconf.get('web:homeurl') });
    }
  });
});

module.exports = router;
