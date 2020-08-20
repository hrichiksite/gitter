'use strict';

function validateProviders(providers) {
  if (!Array.isArray(providers)) return false;

  // blank array also means "everyone is allowed"
  if (providers.length == 0) return true;

  // only github is allowed for now if were not allowing everyone
  return providers.length === 1 && providers[0] === 'github';
}

module.exports = validateProviders;
