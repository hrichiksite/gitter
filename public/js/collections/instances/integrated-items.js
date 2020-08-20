'use strict';

var userModels = require('../users');
var eventModels = require('../events');
var appEvents = require('../../utils/appevents');
var errorHandle = require('../../utils/live-collection-error-handle');

// TODO: find a better home for this....
require('../../components/realtime-troupe-listener');

var rosterCollection = new userModels.RosterCollection(null, { listen: true });
var eventCollection = new eventModels.EventCollection(null, { listen: true, snapshot: true });

rosterCollection.on('error', errorHandle.bind(null, 'roster-collection'));
eventCollection.on('error', errorHandle.bind(null, 'events-collection'));

// update online status of user models
appEvents.on('userLoggedIntoTroupe', updateUserStatus);
appEvents.on('userLoggedOutOfTroupe', updateUserStatus);

function updateUserStatus(data) {
  var user = rosterCollection.get(data.userId);
  if (user) {
    // the backbone models have not always come through before the presence events,
    // but they will come with an accurate online status so we can just ignore the presence event
    user.set('online', data.status === 'in');
  }
}

var collections = {
  roster: rosterCollection,
  events: eventCollection
};

window._intergratedCollections = collections;

module.exports = collections;
