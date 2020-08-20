'use strict';

var collections = require('gitter-web-utils/lib/collections');
var TroupeStrategy = require('./troupe-strategy');
var leanTroupeDao = require('../../services/daos/troupe-dao').full;
var Lazy = require('lazy.js');
const urlJoin = require('url-join');

function GithubRepoStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var troupesIndexed;

  this.preload = function(repos) {
    if (repos.isEmpty()) return;

    var repoFullNames = repos
      .map(function(repo) {
        return repo.full_name;
      })
      .toArray();

    return leanTroupeDao.findByUris(repoFullNames).then(function(troupes) {
      troupesIndexed = collections.indexByProperty(troupes, 'uri');

      return troupeStrategy.preload(Lazy(troupes));
    });
  };

  this.map = function(item) {
    var room = troupesIndexed[item.full_name];
    return {
      type: 'GH_REPO',
      id: item.id,
      name: item.full_name,
      description: item.description,
      absoluteUri: urlJoin('https://github.com', item.full_name),
      uri: item.full_name,
      private: item.private,
      room: room ? troupeStrategy.map(room) : undefined,
      exists: !!room,
      avatar_url: item.owner.avatar_url
    };
  };
}

GithubRepoStrategy.prototype = {
  name: 'GithubRepoStrategy'
};

module.exports = GithubRepoStrategy;
