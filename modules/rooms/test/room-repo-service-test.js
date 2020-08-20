'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var roomRepoService = require('../lib/room-repo-service');

describe('room-repo-service #slow', function() {
  var fixture = fixtureLoader.setup({
    troupe1: {},
    troupe2: {},
    troupe3: {},
    troupe4: {
      group: 'group1'
    },
    group1: {
      securityDescriptor: {
        type: 'GH_REPO',
        admins: 'GH_REPO_PUSH',
        linkPath: 'x/y'
      }
    },
    troupe5: {
      securityDescriptor: {
        type: 'GH_REPO',
        admins: 'GH_REPO_PUSH',
        linkPath: '1/2'
      }
    },
    troupe6: {
      securityDescriptor: {
        type: 'GH_REPO',
        admins: 'GH_REPO_PUSH',
        linkPath: '3/4'
      },
      group: 'group1'
    },
    troupe7: {
      group: 'group2'
    },
    group2: {}
  });

  describe('findAssociatedGithubObjectForRoom', function() {
    it('should deal with rooms with no backing object', function() {
      return roomRepoService
        .findAssociatedGithubObjectForRoom(fixture.troupe1)
        .then(function(result) {
          assert.deepEqual(result, null);
        });
    });

    it('should deal with groups with no backing object', function() {
      return roomRepoService
        .findAssociatedGithubObjectForRoom(fixture.troupe7)
        .then(function(result) {
          assert.deepEqual(result, null);
        });
    });

    it('should deal with rooms backed by a repo', function() {
      return roomRepoService
        .findAssociatedGithubObjectForRoom(fixture.troupe5)
        .then(function(result) {
          assert.deepEqual(result, {
            type: 'GH_REPO',
            linkPath: '1/2'
          });
        });
    });
    it('should deal with groups backed by a repo', function() {
      return roomRepoService
        .findAssociatedGithubObjectForRoom(fixture.troupe4)
        .then(function(result) {
          assert.deepEqual(result, {
            type: 'GH_REPO',
            linkPath: 'x/y'
          });
        });
    });
  });

  describe('findAssociatedGithubRepoForRooms', function() {
    it('should deal with no rooms', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([]).then(function(result) {
        assert.deepEqual(result, {});
      });
    });

    it('should deal with one room, not successful', function() {
      return roomRepoService
        .findAssociatedGithubRepoForRooms([fixture.troupe1])
        .then(function(result) {
          assert.deepEqual(result, {});
        });
    });

    it('should deal with one room, successful', function() {
      return roomRepoService
        .findAssociatedGithubRepoForRooms([fixture.troupe4])
        .then(function(result) {
          var expected = [];
          expected[fixture.troupe4.id] = 'x/y';
          assert.deepEqual(result, expected);
        });
    });

    it('should deal with many rooms', function() {
      return roomRepoService
        .findAssociatedGithubRepoForRooms([fixture.troupe1, fixture.troupe2, fixture.troupe3])
        .then(function(result) {
          assert.deepEqual(result, {});
        });
    });

    it('should deal with mixed rooms', function() {
      return roomRepoService
        .findAssociatedGithubRepoForRooms([fixture.troupe1, fixture.troupe4])
        .then(function(result) {
          var expected = [];
          expected[fixture.troupe4.id] = 'x/y';
          assert.deepEqual(result, expected);
        });
    });

    it('should deal with mixed rooms, 2', function() {
      return roomRepoService
        .findAssociatedGithubRepoForRooms([
          fixture.troupe1,
          fixture.troupe4,
          fixture.troupe5,
          fixture.troupe6
        ])
        .then(function(result) {
          var expected = [];
          expected[fixture.troupe4.id] = 'x/y';
          expected[fixture.troupe5.id] = '1/2';
          expected[fixture.troupe6.id] = '3/4';
          assert.deepEqual(result, expected);
        });
    });
  });
});
