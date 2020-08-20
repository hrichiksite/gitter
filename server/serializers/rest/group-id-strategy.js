'use strict';

var groupService = require('gitter-web-groups/lib/group-service');
var GroupStrategy = require('./group-strategy');

var idStrategyGenerator = require('gitter-web-serialization/lib/id-strategy-generator');
var GroupIdStrategy = idStrategyGenerator('GroupIdStrategy', GroupStrategy, groupService.findByIds);

module.exports = GroupIdStrategy;
