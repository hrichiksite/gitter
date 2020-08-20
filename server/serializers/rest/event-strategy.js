'use strict';

var getVersion = require('gitter-web-serialization/lib/get-model-version');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function EventStrategy(options) {
  if (!options) options = {};

  this.preload = function() {};

  this.map = function(item) {
    var prerendered = item.meta && item.meta.prerendered;

    return {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      meta: item.meta || {},
      payload: prerendered ? undefined : item.payload,
      v: getVersion(item)
    };
  };
}

EventStrategy.prototype = {
  name: 'EventStrategy'
};

module.exports = EventStrategy;
