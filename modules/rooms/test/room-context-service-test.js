'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var assert = require('assert');
var mockito = require('jsmockito').JsMockito;
var Promise = require('bluebird');

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('room-context-service', function() {
  var createPolicyForRoom, createPolicyForOneToOne, roomContextService, access;

  var fixture = fixtureLoader.setup({
    user1: {},
    user2: {},
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {}
  });

  beforeEach(function() {
    createPolicyForRoom = mockito.mockFunction();
    createPolicyForOneToOne = mockito.mockFunction();
    access = false;

    mockito
      .when(createPolicyForRoom)()
      .then(function() {
        return Promise.resolve({
          canRead: function() {
            return Promise.resolve(access);
          }
        });
      });

    mockito
      .when(createPolicyForOneToOne)()
      .then(function() {
        return Promise.resolve({
          canRead: function() {
            return Promise.resolve(access);
          },
          canJoin: function() {
            return Promise.resolve(access);
          }
        });
      });

    roomContextService = proxyquireNoCallThru('../lib/room-context-service', {
      'gitter-web-permissions/lib/policy-factory': {
        createPolicyForRoom: createPolicyForRoom,
        createPolicyForOneToOne: createPolicyForOneToOne
      }
    });
  });

  it('should generate context for non-members', function() {
    access = true;
    return roomContextService
      .findContextForUri(fixture.user1, fixture.troupe2.uri, {})
      .then(function(roomContext) {
        assert(!roomContext.roomMember);
      });
  });

  it('should generate context for members', function() {
    access = true;
    return roomContextService
      .findContextForUri(fixture.user1, fixture.troupe1.uri, {})
      .then(function(roomContext) {
        assert(roomContext.roomMember);
      });
  });

  it('should throw for users without access to the room', function() {
    access = false;

    return roomContextService
      .findContextForUri(fixture.user1, fixture.troupe2.uri, {})
      .then(function(/*roomContext*/) {})
      .catch(function(err) {
        assert.strictEqual(err.status, 404);
      });
  });

  it('should generate context for 1:1', function() {
    access = true;

    return roomContextService
      .findContextForUri(fixture.user1, fixture.user2.username, {})
      .then(function(roomContext) {
        assert(roomContext.roomMember);
      });
  });

  it('should throw a redirect for 1:1 same user', function() {
    return roomContextService
      .findContextForUri(fixture.user1, fixture.user1.username, {})
      .then(function(roomContext) {
        assert.strictEqual(roomContext.ownUrl, true);
        assert.strictEqual(roomContext.uri, fixture.user1.username);
      });
  });

  it('should be logged in to see a 1:1', function() {
    return roomContextService.findContextForUri(null, fixture.user1.username, {}).then(
      function(/*roomContext*/) {
        assert.ok(false);
      },
      function(err) {
        assert.strictEqual(err.status, 401);
      }
    );
  });
});
