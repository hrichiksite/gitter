'use strict';

var invitesService = require('../lib/invites-service');
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var StatusError = require('statuserror');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('invite-service', function() {
  describe('integration tests #slow', function() {
    describe('createInvite', function() {
      it('should create an invite', function() {
        var roomId = new ObjectID();
        var invitedBy = new ObjectID();

        return invitesService
          .createInvite(roomId, {
            type: 'github',
            externalId: 'gitterawesome',
            invitedByUserId: invitedBy,
            emailAddress: 'test@gitter.im'
          })
          .then(function(invite) {
            assert.strictEqual(invite.state, 'PENDING');
            assert.strictEqual(String(invite.invitedByUserId), String(invitedBy));
            assert.strictEqual(String(invite.troupeId), String(roomId));
            assert.strictEqual(invite.userId, null);
            assert.strictEqual(invite.emailAddress, 'test@gitter.im');
            assert.strictEqual(invite.externalId, 'gitterawesome');
            assert.strictEqual(invite.type, 'github');
          });
      });

      it('should not allow duplicate invites', function() {
        var roomId = new ObjectID();
        var invitedBy = new ObjectID();

        return invitesService
          .createInvite(roomId, {
            type: 'github',
            externalId: 'gitterawesome',
            invitedByUserId: invitedBy,
            emailAddress: 'test@gitter.im'
          })
          .then(function() {
            return invitesService.createInvite(roomId, {
              type: 'github',
              externalId: 'gitterawesome',
              invitedByUserId: invitedBy,
              emailAddress: 'test@gitter.im'
            });
          })
          .then(function() {
            assert.ok(false, 'Expected exception');
          })
          .catch(StatusError, function(err) {
            assert.strictEqual(err.status, 409);
          });
      });
    });

    describe('create-accept-complete flow', function() {
      it('should accept an invite', function() {
        var roomId = new ObjectID();
        var invitedBy = new ObjectID();
        var userId = new ObjectID();
        var userId2 = new ObjectID();

        return invitesService
          .createInvite(roomId, {
            type: 'github',
            externalId: 'gitterawesome',
            invitedByUserId: invitedBy,
            emailAddress: 'test@gitter.im'
          })
          .bind({
            invite: null
          })
          .then(function(invite) {
            this.invite = invite;
            return invitesService.accept(userId, invite.secret);
          })
          .then(function(invite) {
            assert.strictEqual(String(invite._id), String(this.invite._id));
            return invitesService.markInviteAccepted(invite._id, userId);
          })
          .then(function() {
            // Attempt to reuse the invite, same user
            return invitesService.accept(userId, this.invite.secret);
          })
          .then(function(invite) {
            assert.strictEqual(String(invite._id), String(this.invite._id));
            return invitesService
              .accept(userId2, this.invite.secret)
              .then(function() {
                assert.ok(false, 'Expected exception');
              })
              .catch(StatusError, function(err) {
                assert.strictEqual(err.status, 404);
              });
          })
          .then(function() {
            return TroupeInvite.findById(this.invite._id);
          })
          .then(function(invite) {
            assert.strictEqual(invite.state, 'ACCEPTED');
            assert.strictEqual(String(invite.userId), String(userId));
          });
      });
    });
  });

  describe('findInvitesForReminder #slow', function() {
    var fixture = fixtureLoader.setup({
      troupe1: {},
      user1: {}
    });

    it('should return invites', function() {
      return invitesService
        .createInvite(fixture.troupe1._id, {
          type: 'email',
          emailAddress: fixtureLoader.generateEmail(),
          invitedByUserId: fixture.user1._id
        })
        .bind({
          inviteId: null
        })
        .then(function(invite) {
          this.inviteId = invite._id;
          return invitesService.findInvitesForReminder(-1);
        })
        .then(function(invites) {
          assert(invites.length > 1);
          var inviteId = this.inviteId;
          var originalInvite = invites.filter(function(f) {
            return String(inviteId) === String(f.invite._id);
          })[0];

          assert(originalInvite);
          assert(originalInvite.invite);
          assert(originalInvite.invitedByUser);
          assert(originalInvite.troupe);

          assert.strictEqual(String(originalInvite.invite._id), String(inviteId));
          assert.strictEqual(String(originalInvite.invitedByUser._id), String(fixture.user1._id));
          assert.strictEqual(String(originalInvite.troupe._id), String(fixture.troupe1._id));
        });
    });
  });
});
