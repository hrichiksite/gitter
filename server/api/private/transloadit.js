'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;
var nconf = env.config;

var groupService = require('gitter-web-groups/lib/group-service');
var userService = require('gitter-web-users');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var chatService = require('gitter-web-chats');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var GroupWithPolicyService = require('../../services/group-with-policy-service');

var redis = require('gitter-web-utils/lib/redis');
var redisClient = redis.getClient();

function fixUrl(url) {
  return url.replace(
    nconf.get('transloadit:bucket') + '.s3.amazonaws.com',
    nconf.get('transloadit:cname')
  );
}

function handleUploadToRoom(transloadit, metadata) {
  return Promise.join(
    troupeService.findById(metadata.room_id),
    userService.findById(metadata.user_id)
  )
    .bind({
      room: null,
      user: null
    })
    .spread(function(room, user) {
      if (!room) throw new StatusError(404, 'Unable to find room ' + metadata.room_id);
      if (!user) throw new StatusError(404, 'Unable to find user ' + metadata.user_id);

      this.room = room;
      this.user = user;

      return policyFactory.createPolicyForRoom(user, room);
    })
    .then(function(policy) {
      return policy.canWrite();
    })
    .then(function(writeAccess) {
      if (!writeAccess) throw new StatusError(403);
      var room = this.room;
      var user = this.user;

      if (!transloadit.results[':original'] || !transloadit.results[':original'].length) {
        throw new StatusError(
          500,
          'Transloadit upload failed' + transloadit.message
            ? ': ' + transloadit.message
            : '. AssemblyID: ' + transloadit.assembly_id
        );
      }

      var thumbs = {};

      if (transloadit.results['doc_thumbs']) {
        transloadit.results['doc_thumbs'].forEach(function(thumb) {
          thumbs[thumb.original_id] = fixUrl(thumb.ssl_url);
        });
      }

      if (transloadit.results['img_thumbs']) {
        transloadit.results['img_thumbs'].forEach(function(thumb) {
          thumbs[thumb.original_id] = fixUrl(thumb.ssl_url);
        });
      }

      // Generate a message for each uploaded file.
      return Promise.map(
        transloadit.results[':original'],
        function(upload) {
          var name = upload.name;
          var url = fixUrl(upload.ssl_url);
          var thumb = thumbs[upload.id];

          var text;
          if (thumb) {
            text = '[![' + name + '](' + thumb + ')](' + url + ')';
          } else {
            text = '[' + name + '](' + url + ')';
          }

          stats.event('file.upload');
          return chatService.newChatMessageToTroupe(room, user, { text: text });
        },
        { concurrency: 1 }
      );
    });
}

function handleUploadToGroup(transloadit, metadata) {
  var group, user, policy;

  return Promise.join(
    groupService.findById(metadata.group_id, { lean: true }),
    userService.findById(metadata.user_id)
  )
    .spread(function(_group, _user) {
      group = _group;
      user = _user;

      if (!group) throw new StatusError(404, 'Unable to find group ' + metadata.group_id);
      if (!user) throw new StatusError(404, 'Unable to find user ' + metadata.user_id);

      return policyFactory.createPolicyForGroupId(user, group._id);
    })
    .then(function(_policy) {
      policy = _policy;
      return policy.canWrite();
    })
    .then(function(writeAccess) {
      if (!writeAccess) throw new StatusError(403);

      var groupWithPolicyService = new GroupWithPolicyService(group, user, policy);

      const hasOriginalFinalResults =
        transloadit.results['original_final'] && transloadit.results['original_final'].length;
      if (!hasOriginalFinalResults) {
        throw new StatusError(
          500,
          'Transloadit upload failed' +
            (transloadit.message
              ? ': ' + transloadit.message
              : '. AssemblyID: ' + transloadit.assembly_id)
        );
      }

      const upload = transloadit.results['original_final'][0];

      // TODO: should we delete the existing image if there is one?

      return groupWithPolicyService.setAvatar(upload.ssl_url);
    })
    .then(function() {
      stats.event('file.upload');
    });
}

function _handleUpload(transloadit, metadata) {
  if (metadata.room_id) {
    return handleUploadToRoom(transloadit, metadata);
  } else if (metadata.group_id) {
    return handleUploadToGroup(transloadit, metadata);
  } else {
    throw new StatusError(400, 'Unknown upload type.');
  }
}

var handleUpload = Promise.method(_handleUpload);

function transloaditRoute(req, res, next) {
  var token = req.params.token;

  redisClient.get('transloadit:' + token, function(err, data) {
    if (err) return next(err);

    if (!data) return next(new StatusError(404));

    var metadata;
    try {
      metadata = JSON.parse(data);
    } catch (e) {
      logger.info('Unable to parse redis data', { data: data });
      return next(new Error('JSON parse error: ' + e.message));
    }

    var transloadit;
    try {
      transloadit = req.body.transloadit;

      if (typeof transloadit === 'string') {
        transloadit = JSON.parse(req.body.transloadit);
      }
    } catch (e) {
      return next(new Error('Transloadit json parse error: ' + e.message));
    }

    if (!transloadit) {
      return next(new Error('Failed to parse transloadit response'));
    }

    if (transloadit.ok !== 'ASSEMBLY_COMPLETED') {
      return next(
        new Error(
          'Transload did not return ASSEMBLY_COMPLETED: ok=' +
            transloadit.ok +
            ', error=' +
            transloadit.error +
            ', message=' +
            transloadit.message
        )
      );
    }

    return handleUpload(transloadit, metadata)
      .then(function() {
        res.sendStatus(200);
      })
      .catch(function(err) {
        stats.event('transloadit.failure');
        next(err);
      });
  });
}

module.exports = transloaditRoute;
