'use strict';

var troupeService = require('gitter-web-rooms/lib/troupe-service');
var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');
var TroupeStrategy = require('./troupe-strategy');
var TroupeIdStrategy = idStrategyGenerator(
  'TroupeIdStrategy',
  TroupeStrategy,
  troupeService.findByIds
);

module.exports = TroupeIdStrategy;
