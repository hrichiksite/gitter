'use strict';

var persistence = require('gitter-web-persistence');
var processText = require('gitter-web-text-processor');
var ObjectID = require('mongodb').ObjectID;
var Promise = require('bluebird');
var StatusError = require('statuserror');

exports.newEventToTroupe = function(troupe, user, text, meta, payload, callback) {
  text = text ? '' + text : '';

  return Promise.try(function() {
    if (!troupe) throw new StatusError(500, 'Invalid troupe');
    if (!text) throw new StatusError(400, 'Text required');

    return processText(text);
  })
    .then(function(parsed) {
      var event = new persistence.Event();

      event.fromUserId = user ? user.id : null;
      event.toTroupeId = troupe.id;
      event.sent = new Date();
      event.text = text;
      event.html = parsed.html;
      event.meta = meta;
      event.payload = payload;

      return event.save();
    })
    .nodeify(callback);
};

exports.findEventsForTroupe = function(troupeId, options, callback) {
  var q = persistence.Event.where('toTroupeId', troupeId);

  if (options.startId) {
    var startId = new ObjectID(options.startId);
    q = q.where('_id').gte(startId);
  }

  if (options.beforeId) {
    var beforeId = new ObjectID(options.beforeId);
    q = q.where('_id').lt(beforeId);
  }

  return q
    .sort(options.sort || { sent: 'desc' })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .exec()
    .then(function(results) {
      return results;
    })
    .nodeify(callback);
};
