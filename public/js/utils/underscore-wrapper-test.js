'use strict';

var underscoreWrapper = require('./underscore-wrapper');
var assert = require('assert');
var moment = require('moment');

describe('underscore-wrapper', function() {
  it('should return equal on equal moment dates', function() {
    var m = moment();
    var n = moment(m);
    assert.strictEqual(underscoreWrapper.isEqual(m, n), true);
  });

  it('should return equal on equal moment dates with different languages', function() {
    var m = moment();
    m.locale('fr');
    var n = moment(m);
    n.locale('de');
    assert.strictEqual(underscoreWrapper.isEqual(m, n), true);
  });

  it('should return equal on equal objects with moment dates with different languages', function() {
    var m = moment();
    m.locale('fr');
    var n = moment(m);
    n.locale('de');
    var o1 = {
      date: m
    };

    var o2 = {
      date: n
    };

    assert.strictEqual(underscoreWrapper.isEqual(o1, o2), true);
  });
});
