'use strict';
/**
 * Tests whether the code runs in native **Desktop** app.
 */
module.exports = userAgentString => {
  const stringToTest =
    userAgentString || (typeof navigator === 'object' && navigator.userAgent) || '';

  return stringToTest.toLowerCase().indexOf('gitter') >= 0;
};
