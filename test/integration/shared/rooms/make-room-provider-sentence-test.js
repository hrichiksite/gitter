'use strict';

var assert = require('assert');
var testRequire = require('../../test-require');
var makeRoomProviderSentence = testRequire('../shared/rooms/make-room-provider-sentence');

describe('make-room-provider-sentence', function() {
  it('should tell you only GitHub users are allowed.', function() {
    assert.equal(makeRoomProviderSentence(['github']), 'Only GitHub users can join this room.');
  });
  it('should tell you only GitHub and GitLab users are allowed.', function() {
    assert.equal(
      makeRoomProviderSentence(['github', 'gitlab']),
      'Only GitHub and GitLab users can join this room.'
    );
  });
  it('should tell you only GitHub and Twitter users are allowed.', function() {
    assert.equal(
      makeRoomProviderSentence(['github', 'twitter']),
      'Only GitHub and Twitter users can join this room.'
    );
  });
  it('should tell you only GitHub, Twitter and LinkedIn users are allowed.', function() {
    assert.equal(
      makeRoomProviderSentence(['github', 'twitter', 'facebook']),
      'Only GitHub, Twitter and Facebook users can join this room.'
    );
  });
});
