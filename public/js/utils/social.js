'use strict';

var assertRoom = function(uri) {
  if (!uri) {
    throw new Error('share urls require a room uri');
  }
};

module.exports = {
  generateTwitterShareUrl: function(uri) {
    assertRoom(uri);

    return (
      'https://twitter.com/share?' +
      'text=' +
      encodeURIComponent('Join the chat room on Gitter for ' + uri + ':') +
      '&url=https://gitter.im/' +
      uri +
      '&related=gitchat' +
      '&via=gitchat'
    );
  },

  generateFacebookShareUrl: function(uri) {
    assertRoom(uri);

    return 'http://www.facebook.com/sharer/sharer.php?u=https://gitter.im/' + uri;
  },

  generateLinkedinShareUrl: function(uri) {
    assertRoom(uri);

    return (
      'https://www.linkedin.com/shareArticle?' +
      'mini=true' +
      '&url=https://gitter.im/' +
      uri +
      '&title=' +
      encodeURIComponent(uri + ' on Gitter') +
      '&summary=' +
      encodeURIComponent('Join the chat room on Gitter for ' + uri) +
      '&source=Gitter'
    );
  },

  generateGooglePlusShareUrl: function(uri) {
    assertRoom(uri);

    return 'https://plus.google.com/share?url=https://gitter.im/' + uri;
  }
};
