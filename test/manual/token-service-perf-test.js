'use strict';

var speedy = require('speedy');
var oauthService = require('gitter-web-oauth');

speedy.run({
  a: function(done) {
    return oauthService
      .generateAnonWebToken()
      .spread(function(token) {
        return oauthService.validateAccessTokenAndClient(token);
      })
      .nodeify(done);
  }
});

speedy.on('end', function() {
  process.exit();
});
