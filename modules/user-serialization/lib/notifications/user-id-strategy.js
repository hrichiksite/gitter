'use strict';

var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');
var loader = require('../loader');
var UserStrategy = require('./user-strategy');

var UserIdStrategy = idStrategyGenerator('UserIdStrategy', UserStrategy, loader);

module.exports = UserIdStrategy;
