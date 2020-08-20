'use strict';

var assert = require('assert');
var proxyquire = require('proxyquire').noCallThru();
var Promise = require('bluebird');

var anna = { _id: 'a', username: 'akk', displayName: 'Anna Apple' };
var bob = { _id: 'b', username: 'boo', displayName: 'Bob Boulder' };
var room = {
  oneToOneUsers: [{ userId: anna._id }, { userId: bob._id }]
};

var typeahead = proxyquire('../../../../server/services/typeaheads/user-typeahead-one-to-one', {
  'gitter-web-users': {
    findByIds: function() {
      return Promise.resolve([anna, bob]);
    }
  }
});

describe('user-typeahead-one-to-one', function() {
  it('matches displayNames', function() {
    return typeahead.query('Anna', room).then(function(matches) {
      assert.deepEqual(matches, [anna]);
    });
  });

  it('matches nothing when given an empty string', function() {
    return typeahead.query('', room).then(function(matches) {
      assert.deepEqual(matches, []);
    });
  });

  it('matches usernames', function() {
    return typeahead.query('boo', room).then(function(matches) {
      assert.deepEqual(matches, [bob]);
    });
  });

  it('matches surnames', function() {
    return typeahead.query('Boulder', room).then(function(matches) {
      assert.deepEqual(matches, [bob]);
    });
  });

  it('ignores case', function() {
    return typeahead.query('boulder', room).then(function(matches) {
      assert.deepEqual(matches, [bob]);
    });
  });

  it('ignores missing spaces', function() {
    return typeahead.query('annaapple', room).then(function(matches) {
      assert.deepEqual(matches, [anna]);
    });
  });

  it('allows spaces', function() {
    return typeahead.query('anna apple', room).then(function(matches) {
      assert.deepEqual(matches, [anna]);
    });
  });
});
