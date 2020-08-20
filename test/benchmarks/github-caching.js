'use strict';

var makeBenchmark = require('../make-benchmark');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;

makeBenchmark({
  before: function(done) {
    var g = new GitHubOrgService();
    g.getOrg('gitterHQ').nodeify(done);
  },
  tests: {
    'with snappy': function(done) {
      var g = new GitHubOrgService();
      g.getOrg('gitterHQ').nodeify(done);
    },

    'without snappy': function(done) {
      var g = new GitHubOrgService.raw();
      g.getOrg('gitterHQ').nodeify(done);
    }
  }
});
