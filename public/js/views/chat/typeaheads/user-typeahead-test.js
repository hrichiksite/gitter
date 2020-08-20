/*jslint node:true, unused:true*/
/*global describe:true, it:true */

'use strict';

var assert = require('assert');

describe('user-typeahead', function() {
  it('suggests the latest message senders, most recent first', function() {
    var typeahead = generateTypeahead({
      chatSenders: [
        user('1-oldest'),
        user('2'),
        user('3'),
        user('4'),
        user('5'),
        user('6'),
        user('7'),
        user('8'),
        user('9'),
        user('10-newest')
      ]
    });

    typeahead.search('', function(results, ignore) {
      if (ignore) return;
      assert.deepEqual(usernames(results), [
        '10-newest',
        '9',
        '8',
        '7',
        '6',
        '5',
        '4',
        '3',
        '2',
        '1-oldest'
      ]);
    });
  });

  it('suggests @/all to the admin', function() {
    var typeahead = generateTypeahead({
      isAdmin: true,
      chatSenders: [
        user('1-oldest'),
        user('2'),
        user('3'),
        user('4'),
        user('5'),
        user('6'),
        user('7'),
        user('8'),
        user('9'),
        user('10-newest')
      ]
    });

    typeahead.search('', function(results, ignore) {
      if (ignore) return;
      assert.deepEqual(usernames(results), [
        '10-newest',
        '9',
        '8',
        '7',
        '6',
        '5',
        '4',
        '3',
        '2',
        '/all'
      ]);
    });
  });

  it('ignores null users', function() {
    var typeahead = generateTypeahead({
      chatSenders: [user('tina'), user('bradley'), user('jon'), null, user('rachel')]
    });

    typeahead.search('', function(results, ignore) {
      if (ignore) return;
      assert.deepEqual(usernames(results), ['rachel', 'jon', 'bradley', 'tina']);
    });
  });

  it('doesnt suggest the same user twice', function() {
    var typeahead = generateTypeahead({
      chatSenders: [user('jon'), user('tina'), user('jon')]
    });

    typeahead.search('', function(results, ignore) {
      if (ignore) return;
      assert.deepEqual(usernames(results), ['jon', 'tina']);
    });
  });
});

function generateTypeahead(options) {
  options = options || {};
  var chats = (options.chatSenders || []).map(function(sender) {
    return {
      get: function() {
        return sender;
      }
    };
  });

  jest.mock('../../../utils/is-mobile', () => {
    return function() {
      return false;
    };
  });

  jest.mock('gitter-web-client-context');
  const context = require('gitter-web-client-context');
  context.isTroupeAdmin.mockImplementation(() => !!options.isAdmin);
  context.user.mockImplementation(function() {
    return {
      get: function() {
        return 'test-user';
      }
    };
  });
  context.troupe.mockImplementation(function() {
    return {
      on: () => {}
    };
  });

  jest.mock('../../../components/api-client', () => ({}));

  jest.mock('../../../views/chat/typeaheads/tmpl/typeahead.hbs', () => {
    return function() {};
  });

  const createUserTypeahead = require('./user-typeahead');
  createUserTypeahead.testOnly.clearPrevResults();
  return createUserTypeahead(chats);
}

function usernames(users) {
  return users.map(function(user) {
    return user.username;
  });
}

function user(username) {
  return {
    id: username,
    username: username,
    displayName: username
  };
}
