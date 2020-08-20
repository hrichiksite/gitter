'use strict';

var Troupe = require('gitter-web-persistence').Troupe;
var Group = require('gitter-web-persistence').Group;
var Promise = require('bluebird');

function getUsedLinkPathsForModel(Model, type, linkPaths) {
  var query = {
    'sd.type': type,
    'sd.linkPath': {
      $in: linkPaths
    }
  };
  return Model.distinct('sd.linkPath', query).exec();
}

function getUsedLinkPaths(type, linkPaths) {
  return Promise.join(
    getUsedLinkPathsForModel(Group, type, linkPaths),
    getUsedLinkPathsForModel(Troupe, type, linkPaths),
    function(groups, repos) {
      return groups.concat(repos).reduce(function(map, linkPath) {
        map[linkPath] = true;
        return map;
      }, {});
    }
  );
}

module.exports = {
  getUsedLinkPaths: getUsedLinkPaths
};
