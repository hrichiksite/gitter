'use strict';

var sampleChatsService = require('../../services/sample-chats-service');

module.exports = function(req, res, next) {
  return sampleChatsService
    .getSamples()
    .then(function(samples) {
      res.send(samples);
    })
    .catch(next);
};
