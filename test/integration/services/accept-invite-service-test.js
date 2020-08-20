'use strict';

var testRequire = require('../test-require');
var invitesService = testRequire('gitter-web-invites/lib/invites-service');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var StatusError = require('statuserror');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;

describe('accept-invite-service', function() {
  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {},
      user2: {},
      troupe1: {}
    });

    var RoomWithPolicyService;
    var policyFactory;
    var acceptInviteService;
    var joinCalled;
    var shouldFail;

    beforeEach(function() {
      joinCalled = 0;
      shouldFail = false;
      RoomWithPolicyService = function() {
        this.joinRoom = function() {
          joinCalled++;
          if (shouldFail) return Promise.reject(new StatusError(403));
          return Promise.resolve();
        };
      };

      policyFactory = {
        createPolicyForRoom: function() {
          return Promise.resolve({});
        }
      };

      acceptInviteService = testRequire.withProxies('./services/accept-invite-service', {
        'gitter-web-rooms/lib/room-with-policy-service': RoomWithPolicyService,
        'gitter-web-permissions/lib/policy-factory': policyFactory
      });
    });

    it('should allow users to be accepted', function() {
      var email = fixtureLoader.generateEmail();
      var troupeId1 = fixture.troupe1.id;
      return invitesService
        .createInvite(troupeId1, {
          type: 'email',
          externalId: email,
          invitedByUserId: fixture.user2._id,
          emailAddress: email
        })
        .bind({
          invite: null
        })
        .then(function(invite) {
          this.invite = invite;
          return acceptInviteService.acceptInvite(fixture.user1, invite.secret);
        })
        .then(function(room) {
          assert.strictEqual(room.id, troupeId1);
          assert.strictEqual(joinCalled, 1);

          return TroupeInvite.findById(this.invite._id);
        })
        .then(function(invite) {
          assert.strictEqual(invite.state, 'ACCEPTED');
          assert.strictEqual(String(invite.userId), String(fixture.user1._id));
        });
    });

    it('should mark invites as rejected', function() {
      var email = fixtureLoader.generateEmail();
      var troupeId1 = fixture.troupe1.id;
      shouldFail = true;
      return invitesService
        .createInvite(troupeId1, {
          type: 'email',
          externalId: email,
          invitedByUserId: fixture.user2._id,
          emailAddress: email
        })
        .bind({
          invite: null
        })
        .then(function(invite) {
          this.invite = invite;
          return acceptInviteService.acceptInvite(fixture.user1, invite.secret);
        })
        .then(function() {
          assert.ok(false, 'Expected exception');
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);

          return TroupeInvite.findById(this.invite._id);
        })
        .then(function(invite) {
          assert.strictEqual(invite.state, 'REJECTED');
          assert.strictEqual(String(invite.userId), String(fixture.user1._id));
        });
    });
  });
});
