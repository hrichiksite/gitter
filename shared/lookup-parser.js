'use strict';

var _ = require('lodash');

var exports = module.exports;

function parseLookups(response, fill) {
  /*
  response contains {lookups: {}, items: []}

  fill is a map of attribute: lookupName where attribute is the result
  attribute that holds the id (fromUser) and lookupName is the name of a key
  inside lookups that holds the array of values (users).

  This function will change response.items in place so that each lookup
  attribute in there will get the full value from lookups.

  Do not use this directly, but rather make/use one function that parses each
  API response type. ie parseChatResults(response)
  */

  // map the lookups by id
  // ie. users: [] becomes users: {}
  var lookupNames = Object.keys(response.lookups);
  var maps = {};
  _.each(lookupNames, function(lookupName) {
    var map = _.indexBy(response.lookups[lookupName], 'id');
    maps[lookupName] = map;
  });

  // fill the lookup values in place
  // ie. result.fromUser which is an id becomes an object
  _.each(response.items, function(item) {
    _.each(fill, function(lookupName, attribute) {
      item[attribute] = maps[lookupName][item[attribute]];
    });
  });

  return response.items;
}
exports.parseLookups = parseLookups;

function parseChats(response) {
  return parseLookups(response, { fromUser: 'users' });
}
exports.parseChats = parseChats;
