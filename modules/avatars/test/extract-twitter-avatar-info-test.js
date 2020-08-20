/*global describe:true, it:true */
'use strict';

var extractTwitterAvatarInfo = require('../shared/extract-twitter-avatar-info');
var assert = require('assert');

describe('extract-twitter-avatar-info', function() {
  it('should extract info from twitter avatars', function() {
    var info = extractTwitterAvatarInfo(
      'https://pbs.twimg.com/profile_images/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg'
    );

    assert.deepEqual(info, {
      id: '378800000308609669',
      filename: 'c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg'
    });
  });

  it('should deal with underscores in the ids', function() {
    var info = extractTwitterAvatarInfo(
      'https://pbs.twimg.com/profile_images/567819058104377344/91aRlK_t_bigger.png'
    );

    assert.deepEqual(info, {
      id: '567819058104377344',
      filename: '91aRlK_t_bigger.png'
    });
  });

  it('should return null for other urls', function() {
    assert.strictEqual(extractTwitterAvatarInfo('moo'), null);
  });
});
