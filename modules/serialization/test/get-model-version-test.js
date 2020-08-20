'use strict';

var persistence = require('gitter-web-persistence');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var getModelVersion = require('../lib/get-model-version');

describe('get-model-version', function() {
  describe('using real mongoose objects #slow', function() {
    var fixture = fixtureLoader.setup({
      user1: {}
    });

    describe('with initial value', function() {
      it('should read the _tv value ', function() {
        return persistence.User.findOne({ _id: fixture.user1._id }).then(function(user) {
          var v = getModelVersion(user);
          assert.strictEqual(v, 1);
        });
      });

      it('should read the _tv value on lean objects', function() {
        return persistence.User.findOne(
          { _id: fixture.user1._id },
          { _tv: 1 },
          { lean: true }
        ).then(function(user) {
          var v = getModelVersion(user);
          assert.strictEqual(v, 1);
        });
      });
    });

    describe('after increment', function() {
      before(function() {
        return fixture.user1.save();
      });

      it('should read the _tv value ', function() {
        return persistence.User.findOne({ _id: fixture.user1._id }).then(function(user) {
          var v = getModelVersion(user);
          assert.strictEqual(v, 2);
        });
      });

      it('should read the _tv value on lean objects', function() {
        return persistence.User.findOne(
          { _id: fixture.user1._id },
          { _tv: 1 },
          { lean: true }
        ).then(function(user) {
          var v = getModelVersion(user);
          assert.strictEqual(v, 2);
        });
      });
    });
  });
});
