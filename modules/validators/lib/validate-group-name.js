'use strict';

function validateGroupName(name) {
  if (typeof name !== 'string') return false;

  if (/^\s+/.test(name)) return false;
  if (/\s+$/.test(name)) return false;

  return !!/^[^\<\>]{1,80}$/.test(name);
}

module.exports = validateGroupName;
