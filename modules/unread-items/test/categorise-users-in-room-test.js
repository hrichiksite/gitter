'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var assert = require('assert');
var Promise = require('bluebird');

describe('categorise-users-in-room', function() {
  var categoriseUsersInRoom, presenceMock, pushNotificationServiceMock, pushNotificationFilterMock;
  var onlineUsers, userCategories, devices, usersAcceptingNotifications;

  beforeEach(function() {
    presenceMock = {
      findOnlineUsersForTroupe: function() {
        return Promise.resolve(onlineUsers);
      },
      categorizeUsersByOnlineStatus: function() {
        return Promise.resolve(userCategories);
      }
    };

    pushNotificationServiceMock = {
      findUsersWithDevices: function() {
        return Promise.resolve(devices);
      }
    };

    pushNotificationFilterMock = {
      findUsersInRoomAcceptingNotifications: function() {
        return Promise.resolve(usersAcceptingNotifications);
      }
    };

    categoriseUsersInRoom = proxyquireNoCallThru('../lib/categorise-users-in-room', {
      'gitter-web-presence': presenceMock,
      'gitter-web-push-notifications': pushNotificationServiceMock,
      'gitter-web-push-notification-filter': pushNotificationFilterMock
    });
  });

  it('should handle online users in room', function(done) {
    onlineUsers = ['user1'];
    userCategories = {
      user1: 'online'
    };

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'inroom' }, result);
      })
      .nodeify(done);
  });

  it('should handle online users not in room', function(done) {
    onlineUsers = ['user2'];
    userCategories = {
      user1: 'online'
    };

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'online' }, result);
      })
      .nodeify(done);
  });

  it('should handle mobile users in room', function(done) {
    onlineUsers = ['user1'];
    userCategories = {
      user1: 'mobile'
    };

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'inroom' }, result);
      })
      .nodeify(done);
  });

  it('should handle connected mobile users not in room', function(done) {
    onlineUsers = ['user2'];
    userCategories = {
      user1: 'mobile'
    };
    devices = [];

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'mobile' }, result);
      })
      .nodeify(done);
  });

  it('should handle connected mobile users not in room with devices', function(done) {
    onlineUsers = ['user2'];
    userCategories = {
      user1: 'mobile'
    };
    devices = ['user1'];
    usersAcceptingNotifications = ['user1'];

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'push_connected' }, result);
      })
      .nodeify(done);
  });

  it('should handle non-connected mobile users not in room with devices', function(done) {
    onlineUsers = ['user2'];
    userCategories = {};
    devices = ['user1'];
    usersAcceptingNotifications = ['user1'];

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'push' }, result);
      })
      .nodeify(done);
  });

  it('should handle connected mobile users not in room with devices who have already been notified', function(done) {
    onlineUsers = ['user2'];
    userCategories = {
      user1: 'mobile'
    };
    devices = ['user1'];
    usersAcceptingNotifications = [];

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'push_notified_connected' }, result);
      })
      .nodeify(done);
  });

  it('should handle non-connected mobile users not in room with devices who have already been notified', function(done) {
    onlineUsers = ['user2'];
    userCategories = {};
    devices = ['user1'];
    usersAcceptingNotifications = [];

    categoriseUsersInRoom('room1', ['user1'])
      .then(function(result) {
        assert.deepEqual({ user1: 'push_notified' }, result);
      })
      .nodeify(done);
  });
});
