'use strict';

var DoubleTapper = require('./double-tapper');
var assert = require('assert');

describe('double-tapper', function() {
  it('recognises a single click', function() {
    var doubleTapper = new DoubleTapper();

    var count = doubleTapper.registerTap();

    assert.equal(count, 1);
  });

  it('recognises an instant double click', function() {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    var count = doubleTapper.registerTap();

    assert.equal(count, 2);
  });

  it('recognises a slow double click', function(done) {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    setTimeout(function() {
      var count = doubleTapper.registerTap();

      assert.equal(count, 2);
      done();
    }, 200);
  });

  it('recognises a two single clicks', function(done) {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    setTimeout(function() {
      var count = doubleTapper.registerTap();

      assert.equal(count, 1);
      done();
    }, 400);
  });

  it('recognises a triple click', function(done) {
    var doubleTapper = new DoubleTapper();

    doubleTapper.registerTap();
    setTimeout(function() {
      doubleTapper.registerTap();

      setTimeout(function() {
        var count = doubleTapper.registerTap();

        assert.equal(count, 3);
        done();
      }, 200);
    }, 200);
  });
});
