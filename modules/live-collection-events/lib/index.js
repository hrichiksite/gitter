'use strict';

var EventEmitter = require('events').EventEmitter;

module.exports = {
  events: new EventEmitter(),
  chats: new EventEmitter(),
  rooms: new EventEmitter(),
  roomMembers: new EventEmitter(),
  users: new EventEmitter(),
  userGroups: new EventEmitter(),
  groupMembers: new EventEmitter()
};
