'use strict';

function cdnMultiFactory(cdnOptions) {
  var emailBasePath = cdnOptions.emailBasePath;
  var hosts = cdnOptions.hosts;
  var hostLength = hosts.length;
  var cdnPrefix = cdnOptions.cdnPrefix;

  return function cdnMulti(url, options) {
    if (!url) url = ''; // This should not be happening

    if (options && options.email) {
      if (!emailBasePath) throw new Error('emailBasePath not supplied');
      return emailBasePath + '/_s/l/' + url;
    }

    var x = 0;
    for (var i = 0; i < url.length; i = i + 3) {
      x = x + url.charCodeAt(i);
    }

    var host = hosts[x % hostLength];

    var prefix = options && options.nonrelative ? 'https://' : '//';

    if (options && options.longTermCache) {
      return prefix + host + '/_s/lt/' + options.longTermCache + '/' + url;
    }

    if (options && options.notStatic === true) {
      return prefix + host + '/' + url;
    }

    return prefix + host + cdnPrefix + '/' + url;
  };
}

module.exports = cdnMultiFactory;
