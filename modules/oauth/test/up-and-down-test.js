'use strict';

var assert = require('assert');
var UpAndDown = require('../lib/tokens/up-and-down');

describe('up-and-down', function() {
  it('should work down and then up', function(done) {
    var ud = new UpAndDown([0, 1, 2, 3]);
    var ds = {};
    var us = {};

    ud.iterate(
      function(item, callback) {
        ds[item] = 1;
        if (item === 2) return callback(null, 'XX');
        return callback();
      },
      function(result, item, callback) {
        us[item] = 2;
        assert.strictEqual('XX', result);
        callback();
      },
      function(err, result) {
        if (err) return done(err);
        assert.strictEqual('XX', result);
        assert.deepEqual({ 0: 1, 1: 1, 2: 1 }, ds);
        assert.deepEqual({ 0: 2, 1: 2 }, us);
        return done();
      }
    );
  });

  it('should deal with the initial provider returning the result', function(done) {
    var ud = new UpAndDown([0, 1, 2, 3]);
    var ds = {};

    ud.iterate(
      function(item, callback) {
        ds[item] = 1;
        if (item === 0) return callback(null, 'YY');
        return callback();
      },
      function(/*result, item, callback*/) {
        assert(false, 'No upstream calls should have been made');
      },
      function(err, result) {
        if (err) return done(err);
        assert.strictEqual('YY', result);
        assert.deepEqual({ 0: 1 }, ds);
        return done();
      }
    );
  });

  it('should ignore errors downstream', function(done) {
    var ud = new UpAndDown([0, 1, 2, 3]);
    var ds = {};
    var us = {};

    ud.iterate(
      function(item, callback) {
        ds[item] = 1;
        if (item === 0) return callback(new Error());
        if (item === 3) return callback(null, 'ZZ');
        return callback();
      },
      function(result, item, callback) {
        us[item] = 2;
        assert.strictEqual('ZZ', result);
        callback();
      },
      function(err, result) {
        if (err) return done(err);
        assert.strictEqual('ZZ', result);
        assert.deepEqual({ 0: 1, 1: 1, 2: 1, 3: 1 }, ds);
        assert.deepEqual({ 0: 2, 1: 2, 2: 2 }, us);
        return done();
      }
    );
  });

  it('should handle exhaustion', function(done) {
    var ud = new UpAndDown([0, 1, 2, 3]);
    var ds = {};

    ud.iterate(
      function(item, callback) {
        ds[item] = 1;
        return callback();
      },
      function(/*result, item, callback*/) {
        assert(false, 'No upstream calls should have been made');
      },
      function(err, result) {
        if (err) return done(err);
        assert.strictEqual(undefined, result);
        assert.deepEqual({ 0: 1, 1: 1, 2: 1, 3: 1 }, ds);
        return done();
      }
    );
  });
});
