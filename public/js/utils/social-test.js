'use strict';

var social = require('./social');
var assert = require('assert');

describe('social', function() {
  it('generates a twitter share url', function() {
    var url = social.generateTwitterShareUrl('owner/room');
    assert.equal(
      url,
      'https://twitter.com/share?text=Join%20the%20chat%20room%20on%20Gitter%20for%20owner%2Froom%3A&url=https://gitter.im/owner/room&related=gitchat&via=gitchat'
    );
  });

  it('throws if it cant generate a twitter share url', function() {
    var expected;
    try {
      social.generateTwitterShareUrl();
    } catch (e) {
      expected = e;
    }

    assert(expected, 'error expected');
  });

  it('generates a facebook share url', function() {
    var url = social.generateFacebookShareUrl('owner/room');
    assert.equal(url, 'http://www.facebook.com/sharer/sharer.php?u=https://gitter.im/owner/room');
  });

  it('throws if it cant generate a facebook share url', function() {
    var expected;
    try {
      social.generateFacebookShareUrl();
    } catch (e) {
      expected = e;
    }

    assert(expected, 'error expected');
  });

  it('generates a linkedin share url', function() {
    var url = social.generateLinkedinShareUrl('owner/room');
    assert.equal(
      url,
      'https://www.linkedin.com/shareArticle?mini=true&url=https://gitter.im/owner/room&title=owner%2Froom%20on%20Gitter&summary=Join%20the%20chat%20room%20on%20Gitter%20for%20owner%2Froom&source=Gitter'
    );
  });

  it('throws if it cant generate a linkedin share url', function() {
    var expected;
    try {
      social.generateLinkedinShareUrl();
    } catch (e) {
      expected = e;
    }

    assert(expected, 'error expected');
  });

  it('generates a google plus share url', function() {
    var url = social.generateGooglePlusShareUrl('owner/room');
    assert.equal(url, 'https://plus.google.com/share?url=https://gitter.im/owner/room');
  });

  it('throws if it cant generate a google plus share url', function() {
    var expected;
    try {
      social.generateGooglePlusShareUrl();
    } catch (e) {
      expected = e;
    }

    assert(expected, 'error expected');
  });
});
