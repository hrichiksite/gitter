'use strict';

function getVersion(item) {
  if (!item) return undefined;
  var v = item.get ? item.get('_tv') : item._tv;
  if (!v) return undefined;
  if (v.valueOf) v = v.valueOf();
  return v ? v : undefined;
}

module.exports = getVersion;
