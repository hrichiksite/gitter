'use strict';

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var serialize = require('gitter-web-serialization/lib/serialize');
var GroupStrategy = testRequire('./serializers/rest/group-strategy');

describe('GroupStrategy', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    group1: {},
    group2: {
      avatarUrl:
        'https://gitter-avatars-beta.s3.amazonaws.com/groups/5798c8fa96b02166f9ac5a7b/original'
    }
  });

  it('should serialize a group', function() {
    var strategy = new GroupStrategy();
    var group = fixture.group1;
    return serialize([group], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: group.id,
          name: group.name,
          uri: group.uri,
          homeUri: group.homeUri,
          backedBy: {
            type: null
          },
          avatarUrl: nconf.get('avatar:officialHost') + '/group/i/' + group.id
        }
      ]);
    });
  });

  it('should serialize a group with avatarUrl set', function() {
    var strategy = new GroupStrategy();
    var group = fixture.group2;
    return serialize([group], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: group.id,
          name: group.name,
          uri: group.uri,
          homeUri: group.homeUri,
          backedBy: {
            type: null
          },
          avatarUrl:
            nconf.get('avatar:officialHost') + '/group/iv/' + group.avatarVersion + '/' + group.id
        }
      ]);
    });
  });

  it('should serialize a group with hasAvatarSet and no avatar set', function() {
    var strategy = new GroupStrategy({ includeHasAvatarSet: true });
    var group = fixture.group1;
    return serialize([group], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: group.id,
          name: group.name,
          uri: group.uri,
          homeUri: group.homeUri,
          backedBy: {
            type: null
          },
          avatarUrl: nconf.get('avatar:officialHost') + '/group/i/' + group.id,
          hasAvatarSet: false
        }
      ]);
    });
  });

  it('should serialize a group with hasAvatarSet and avatar set', function() {
    var strategy = new GroupStrategy({ includeHasAvatarSet: true });
    var group = fixture.group2;
    return serialize([group], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          id: group.id,
          name: group.name,
          uri: group.uri,
          homeUri: group.homeUri,
          backedBy: {
            type: null
          },
          avatarUrl:
            nconf.get('avatar:officialHost') + '/group/iv/' + group.avatarVersion + '/' + group.id,
          hasAvatarSet: true
        }
      ]);
    });
  });
});
