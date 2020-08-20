'use strict';

var url = require('url');

function addSizeParam(avatarUrl, sizeParamName, sizeValue) {
  if (!sizeValue) return avatarUrl;
  var parsed = url.parse(avatarUrl, true);
  parsed.search = null;
  parsed.query[sizeParamName] = sizeValue;
  return url.format(parsed);
}

module.exports = {
  addSizeParam: addSizeParam
};
