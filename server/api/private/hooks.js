'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var winston = env.logger;
var config = env.config;

var crypto = require('crypto');
var eventService = require('gitter-web-events');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var checkRepoPrivacy = require('../../services/check-repo-privacy');
var StatusError = require('statuserror');

const WEBHOOKS_SECRET = config.get('webhooks:secret');
if (!WEBHOOKS_SECRET) {
  winston.error('No webhooks secret provided');
}

// This is a bit of a hack, but it's somewhat useful:
// check to see whether a repo has been made public
function checkRepo(meta) {
  var service = meta.service;
  var event = meta.event;
  var repo = meta.repo;

  if (service === 'github' && event === 'public' && repo) {
    stats.event('webhook.github.public');

    /* Do this asynchronously */
    checkRepoPrivacy(repo).catch(function(err) {
      winston.error('Repo privacy check failed: ' + err, { exception: err });
    });
  }
}

function decipherHash(hash) {
  try {
    var decipher = crypto.createDecipher('aes256', WEBHOOKS_SECRET);
    return decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8');
  } catch (err) {
    /* */
  }
}

module.exports = function(req, res, next) {
  var troupeId = decipherHash(req.params.hash);
  if (!troupeId) {
    stats.event('webhook.invalid.hash');
    return next(new StatusError(400, 'Invalid Troupe hash'));
  }

  var message = req.body.message;
  var meta = req.body.meta;
  var payload = req.body.payload;

  if (meta) {
    checkRepo(meta);
  }

  return troupeService
    .findById(troupeId)
    .then(function(troupe) {
      if (!troupe) return new StatusError(404);

      return eventService.newEventToTroupe(troupe, null, message, meta, payload);
    })
    .then(function() {
      stats.event('webhook.receive.success');
      res.send('OK');
    })
    .catch(function(err) {
      stats.event('webhook.receive.failure');
      if (err) winston.error('Error creating event: ' + err, { exception: err });
      next(err);
    });
};
