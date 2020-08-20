'use strict';

function applyStandardQueryOptions(query, options) {
  if (!options) return;

  if (options.timeout) {
    query.timeout = options.timeout;
  }

  if (options.from) {
    query.from = options.from;
  }

  if (options.limit) {
    query.size = options.limit;
  }

  if (options.sort) {
    query.sort = options.sort;
  }
}

module.exports = applyStandardQueryOptions;
