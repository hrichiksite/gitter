'use strict';

var testRequire = require('../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var groupCreationService = testRequire('./services/group-creation-service');

describe('group-creation-service', function() {
  describe('#slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {}
    });

    it('should create a group without backing', function() {
      var uri = fixture.generateUri();

      return groupCreationService(fixture.user1, {
        uri: uri,
        name: uri,
        defaultRoom: {}
      }).then(function(result) {
        var group = result.group;
        var defaultRoom = result.defaultRoom;
        assert.deepEqual(result.invitesReport, []);

        assert.strictEqual(group.lcUri, uri);
        assert.strictEqual(group.uri, uri);
        assert.strictEqual(group.name, uri);
        assert.strictEqual(group.sd.members, 'PUBLIC');
        assert.strictEqual(group.sd.admins, 'MANUAL');
        assert.deepEqual(group.sd.extraAdmins.map(String), [fixture.user1.id]);
        assert.deepEqual(group.sd.extraMembers.map(String), []);

        assert.strictEqual(defaultRoom.uri, uri + '/community');
        assert.strictEqual(defaultRoom.lcUri, uri + '/community');

        assert.strictEqual(defaultRoom.sd.type, 'GROUP');
        assert.strictEqual(defaultRoom.sd.members, 'PUBLIC');
        assert.strictEqual(defaultRoom.sd.admins, 'GROUP_ADMIN');

        assert.strictEqual(String(defaultRoom.sd.internalId), group.id);
        assert.deepEqual(defaultRoom.sd.extraAdmins.map(String), []);
        assert.deepEqual(defaultRoom.sd.extraMembers.map(String), []);
      });
    });

    it('should create a group with invites', function() {
      var uri = fixture.generateUri();

      return groupCreationService(fixture.user1, {
        uri: uri,
        name: uri,
        defaultRoom: {},
        invites: [
          {
            type: 'gitter',
            externalId: fixture.user2.username
          },
          {
            type: 'github',
            externalId: fixture.generateUsername()
          }
        ]
      }).then(function(result) {
        var group = result.group;
        var defaultRoom = result.defaultRoom;
        assert.strictEqual(result.invitesReport.length, 2);
        assert.strictEqual(result.invitesReport[0].status, 'added');
        assert.strictEqual(result.invitesReport[0].user.id, fixture.user2.id);

        assert.strictEqual(result.invitesReport[1].status, 'error');

        assert.strictEqual(group.lcUri, uri);
        assert.strictEqual(group.uri, uri);
        assert.strictEqual(group.name, uri);
        assert.strictEqual(group.sd.members, 'PUBLIC');
        assert.strictEqual(group.sd.admins, 'MANUAL');
        assert.deepEqual(group.sd.extraAdmins.map(String), [fixture.user1.id]);
        assert.deepEqual(group.sd.extraMembers.map(String), []);

        assert.strictEqual(defaultRoom.uri, uri + '/community');
        assert.strictEqual(defaultRoom.lcUri, uri + '/community');

        assert.strictEqual(defaultRoom.sd.type, 'GROUP');
        assert.strictEqual(defaultRoom.sd.members, 'PUBLIC');
        assert.strictEqual(defaultRoom.sd.admins, 'GROUP_ADMIN');

        assert.equal(String(defaultRoom.sd.internalId), group.id);
        assert.deepEqual(defaultRoom.sd.extraAdmins.map(String), []);

        assert.deepEqual(defaultRoom.sd.extraMembers.map(String), []);
      });
    });
  });
});
