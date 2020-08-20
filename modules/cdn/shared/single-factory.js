'use strict';

function cdnSingleFactory(cdnOptions) {
  var emailBasePath = cdnOptions.emailBasePath;
  var host = cdnOptions.hosts[0];
  var cdnPrefix = cdnOptions.cdnPrefix;

  return function cdnSingle(url, options) {
    if (!url) url = ''; // This should not be happening

    var nonrelative = options && options.nonrelative;
    var email = options && options.email;

    if (email) {
      if (!emailBasePath) throw new Error('emailBasePath not supplied');

      return emailBasePath + '/_s/l/' + url;
    }

    var prefix = nonrelative ? 'https://' : '//';

    if (options && options.longTermCache) {
      return prefix + host + '/_s/lt/' + options.longTermCache + '/' + url;
    }

    if (options && options.notStatic === true) {
      return prefix + host + '/' + url;
    }

    return prefix + host + cdnPrefix + '/' + url;
  };
}

module.exports = cdnSingleFactory;
