'use strict';

var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var chatHeapmapAggregator = require('gitter-web-elasticsearch/lib/chat-heatmap-aggregator');
var moment = require('moment');
var StatusError = require('statuserror');
var debug = require('debug')('gitter:app:chat-heapmap-route');

module.exports = function(req, res, next) {
  var roomId = req.params.roomId;

  // Expand the date range to sort out timezone issues
  var start = req.query.start
    ? moment(req.query.start)
        .subtract(1, 'day')
        .toDate()
    : null;
  var end = req.query.end
    ? moment(req.query.end)
        .add(1, 'day')
        .toDate()
    : null;
  var tz = req.query.tz ? req.query.tz : 0;

  return policyFactory
    .createPolicyForRoomId(req.user, roomId)
    .then(function(policy) {
      return policy.canRead();
    })
    .then(function(hasReadAccess) {
      if (!hasReadAccess) throw new StatusError(404);

      debug('Searching troupeId=%s start=%s end=%s tz=%s', roomId, start, end, tz);

      return chatHeapmapAggregator.getHeatmapForRoom(roomId, start, end, tz);
    })
    .then(function(chatActivity) {
      res.send(chatActivity);
    })
    .catch(next);
};
