'use strict';

module.exports = function trim(name, maxLength) {
  maxLength = maxLength || 25; // defaults to 25

  if (!name || name.length < maxLength) return name; // avoid computing

  var parts = name.split('/'); // break it down

  for (var i = 1; i < parts.length; i++) {
    var sub = parts.slice(i).join('/');
    if (sub.length <= maxLength) return sub; // trying to compose a smaller part that makes sense
  }

  // if all else fails, return the first part only
  return parts.pop();
};
