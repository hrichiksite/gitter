'use strict';
/**
 * Ensures that we can use Backbone Models or Plain Objects in other modules, due to code sharing.
 */
module.exports = function(o) {
  return o.toJSON ? o.toJSON() : o;
};
