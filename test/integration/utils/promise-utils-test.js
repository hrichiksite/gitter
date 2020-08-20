'use strict';

var testRequire = require('../test-require');
var assert = require('assert');
var sinon = require('sinon');
var promiseUtils = testRequire('./utils/promise-utils');
var waterfall = promiseUtils.waterfall;
var Promise = require('bluebird');

function fakeFilter(array) {
  return array.slice();
}

function fakePromiseMaker() {
  return new Promise.resolve([1, 2]);
}

describe('promise-utils', function() {
  describe('waterfall', function() {
    it('should deal with empty makers', function() {
      var filterspy = sinon.spy(fakeFilter);
      return waterfall([], ['foo'], filterspy, 10).then(function(results) {
        assert.equal(results.length, 0);
        assert.equal(filterspy.callCount, 0);
        return results;
      });
    });

    it('should stop calling once there are enough results', function() {
      var maker1 = sinon.spy(fakePromiseMaker);
      var maker2 = sinon.spy(fakePromiseMaker);
      var filterspy = sinon.spy(fakeFilter);
      return waterfall([maker1, maker2], ['foo'], filterspy, 2).then(function(results) {
        assert.equal(results.length, 2);
        assert.equal(maker1.callCount, 1);
        assert.equal(maker2.callCount, 0);
        assert.equal(filterspy.callCount, 1);
        return results;
      });
    });

    it('should limit the results if there is overshoot', function() {
      var maker1 = sinon.spy(fakePromiseMaker);
      var maker2 = sinon.spy(fakePromiseMaker);
      return waterfall([maker1, maker2], ['foo', 'bar', 'baz'], fakeFilter, 3).then(function(
        results
      ) {
        assert.equal(results.length, 3);
        assert(maker1.calledWith('foo', 'bar', 'baz'));
        assert(maker2.calledWith('foo', 'bar', 'baz'));
        return results;
      });
    });

    it("should return what it got if it didn't get enough", function() {
      return waterfall([fakePromiseMaker, fakePromiseMaker], ['foo'], fakeFilter, 100).then(
        function(results) {
          assert.equal(results.length, 4);
          return results;
        }
      );
    });
  });
});
