'use strict';

module.exports = function roomNameShortener(name) {
  if (!name) return '';

  var resultantName = '';
  name
    .split('/')
    .reverse()
    .some(function(piece, index) {
      var newResult = piece + (resultantName.length ? '/' : '') + resultantName;

      if (newResult.length <= 16 || index === 0) {
        resultantName = newResult;
      } else {
        // break, we went over with this piece
        return true;
      }
    }, '');

  return resultantName || name;
};
