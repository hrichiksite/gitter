'use strict';

var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

/**
 * Fixes bad links, like when a browser sends this though
 * /PrismarineJS/node-minecraft-protocol?at=54ea6fcecadb3f7525792ba9)I
 */
function fixMongoIdQueryParam(value) {
  if (!value) return;
  value = '' + value;

  if (value.length > 24) {
    value = value.substring(0, 24);
  }

  if (!mongoUtils.isLikeObjectId(value)) return;

  return value;
}

module.exports = fixMongoIdQueryParam;
