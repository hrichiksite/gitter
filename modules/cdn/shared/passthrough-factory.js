'use strict';

function cdnPassthroughFactory(cdnOptions) {
  var emailBasePath = cdnOptions.emailBasePath;
  var webBasepath = cdnOptions.webBasepath;

  if (cdnOptions.emailBasePath && cdnOptions.webBasepath) {
    return function cdnPassthroughServer(url, options) {
      if (!url) url = ''; // This should not be happening

      if (options && options.email) {
        return emailBasePath + '/_s/l/' + url;
      }

      if (options && options.nonrelative) {
        return webBasepath + '/_s/l/' + url;
      }

      if (options && options.notStatic) {
        return '/' + url;
      }

      return '/_s/l/' + url;
    };
  } else {
    return function cdnPassthrough(url, options) {
      if (!url) url = ''; // This should not be happening

      if (options && options.email) {
        throw new Error(
          `emailBasePath:${cdnOptions.emailBasePath} or webBasepath:${cdnOptions.webBasepath} not supplied`
        );
      }

      if (options && options.notStatic) {
        return '/' + url;
      }

      return '/_s/l/' + url;
    };
  }
}

module.exports = cdnPassthroughFactory;
