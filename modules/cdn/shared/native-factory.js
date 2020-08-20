'use strict';

function cdnNativeFactory(/*cdnOptions*/) {
  return function cdnNative(url /*, options*/) {
    if (!url) url = ''; // This should not be happening

    // nicest way of supporting embedded mobile chat
    return '../' + url;
  };
}

module.exports = cdnNativeFactory;
