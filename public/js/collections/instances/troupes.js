'use strict';

var roomSort = require('gitter-realtime-client').sortsFilters.model;
var troupeModels = require('../troupes');
var groupModels = require('../groups');
var orgModels = require('../orgs');
var unreadItemsClient = require('../../components/unread-items-frame-client');
var unreadItemsGroupAdapter = require('../../components/unread-items-group-adapter');
var appEvents = require('../../utils/appevents');
var errorHandle = require('../../utils/live-collection-error-handle');
var context = require('gitter-web-client-context');
var moment = require('moment');
var _ = require('lodash');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');

var roomsSnapshot = context.getSnapshot('allRooms') || [];
var existingRooms = roomsSnapshot.map(function(data) {
  return data.lastAccessTime
    ? _.extend(data, { lastAccessTime: moment(data.lastAccessTime) })
    : data;
});
var troupeCollection = new troupeModels.TroupeCollection(existingRooms, { listen: true });

var groupsSnapshot = context.getSnapshot('groups') || [];
var groupCollection;
groupCollection = new groupModels.Collection(groupsSnapshot, { listen: true });
groupCollection.on('error', errorHandle.bind(null, 'group-collection'));

// Adapt unread items to the groups collection
unreadItemsGroupAdapter(groupCollection, troupeCollection);

var orgsCollection = new orgModels.OrgCollection(null, { listen: true });
orgsCollection.on('error', errorHandle.bind(null, 'org-collection'));

unreadItemsClient.installTroupeListener(troupeCollection);

function filterTroupeCollection(filter, comparator) {
  var c = new SimpleFilteredCollection([], {
    model: troupeModels.TroupeModel,
    collection: troupeCollection,
    comparator: comparator,
    autoResort: true
  });
  c.setFilter(filter);
  return c;
}

// collection of favourited troupes
var favourites = filterTroupeCollection(roomSort.favourites.filter, roomSort.favourites.sort);

// collection of recent troupes exc. favourites
var recentRoomsNonFavourites = filterTroupeCollection(
  roomSort.recents.filter,
  roomSort.recents.sort
);

appEvents.on('activity', function(message) {
  /* Lurk mode... */

  var troupeId = message.troupeId;
  var model = troupeCollection.get(troupeId);
  if (!model) return;

  if (!model.get('lurk')) return;
  var a = model.get('activity');
  if (a) {
    model.set('activity', a + 1);
  } else {
    model.set('activity', 1);
  }
});

//We never post activity changes back to the server so
//reset lurk activity for the current room JP 4/2/16
context.troupe().on('change:id', function(troupe, val) {
  var activeRoom = troupeCollection.get(val);
  if (activeRoom) {
    activeRoom.set('activity', false);
  }
});

var collections = {
  /* All rooms */
  troupes: troupeCollection,
  /* Filtered rooms */
  favourites: favourites,
  recentRoomsNonFavourites: recentRoomsNonFavourites,
  orgs: orgsCollection,
  groups: groupCollection
};

window._troupeCollections = collections;
module.exports = collections;
