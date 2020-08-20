/* global describe:true, it:true */
'use strict';

var USER = { username: 'gittertestbot' };
var badgerService = require('../lib/badger-service');
var client = badgerService.testOnly.client;

describe('badger-service #slow', function() {
  // Skip tests in the automated test as they create too much noise
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'test-docker' ||
    process.env.SKIP_BADGER_TESTS
  )
    return;

  this.timeout(100000);
  it('should create pull requests for repos that do not have a master branch', function() {
    var uri = 'gittertestbot/does-not-have-a-master-branch';
    return badgerService.sendBadgePullRequest(uri, uri, USER).finally(function() {
      return client
        .del('/repos/gitter-badger/does-not-have-a-master-branch', {})
        .catch(function() {});
    });
  });

  it('should create pull requests for repos that do not have a README markdown', function() {
    var uri = 'gittertestbot/no-readme-markdown-file-2';
    return badgerService.sendBadgePullRequest(uri, uri, USER).finally(function() {
      return client.del('/repos/gitter-badger/no-readme-markdown-file-2', {}).catch(function() {});
    });
  });

  it('should create pull requests for repos that have a README.markdown', function() {
    var uri = 'gittertestbot/readme-dot-markdown';
    var roomUri = 'gittertestbot/community';
    return badgerService.sendBadgePullRequest(uri, roomUri, USER).finally(function() {
      return client.del('/repos/gitter-badger/readme-dot-markdown', {}).catch(function() {});
    });
  });

  it('should create pull requests for repos that have a textile readme', function() {
    var uri = 'gittertestbot/readme-dot-textile';
    return badgerService.sendBadgePullRequest(uri, uri, USER).finally(function() {
      return client.del('/repos/gitter-badger/readme-dot-textile', {}).catch(function() {});
    });
  });

  it('should create pull requests for repos that have a rst readme', function() {
    var uri = 'gittertestbot/readme-dot-rst';
    return badgerService.sendBadgePullRequest(uri, uri, USER).finally(function() {
      return client.del('/repos/gitter-badger/readme-dot-rst', {}).catch(function() {});
    });
  });

  it('should create pull requests for repos that have a plaintext readme', function() {
    var uri = 'gittertestbot/readme-dot-txt';
    var roomUri = 'gittertestbot/community';
    return badgerService.sendBadgePullRequest(uri, roomUri, USER).finally(function() {
      return client.del('/repos/gitter-badger/readme-dot-txt', {}).catch(function() {});
    });
  });
});
