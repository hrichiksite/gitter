'use strict';

var collections = require('gitter-web-utils/lib/collections');
var TroupeStrategy = require('./troupe-strategy');
var leanTroupeDao = require('../../services/daos/troupe-dao').full;
var Lazy = require('lazy.js');

function TroupeUriStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(uris) {
    return leanTroupeDao.findByUris(uris.toArray()).then(function(troupes) {
      troupesIndexed = collections.indexByProperty(troupes, 'uri');

      return troupeStrategy.preload(Lazy(troupes));
    });
  };

  this.map = function(uri) {
    var troupe = troupesIndexed[uri];
    if (!troupe) return null;
    return troupeStrategy.map(troupe);
  };
}
TroupeUriStrategy.prototype = {
  name: 'TroupeUriStrategy'
};

module.exports = TroupeUriStrategy;
