'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var redis = require('gitter-web-utils/lib/redis');
var uuid = require('uuid/v4');
var StatusError = require('statuserror');
var Promise = require('bluebird');
const policyFactory = require('gitter-web-permissions/lib/policy-factory');

var singletonTransloaditClient;

function getTransloaditClient() {
  if (singletonTransloaditClient) {
    return singletonTransloaditClient;
  }

  var TransloaditClient = require('transloadit');
  singletonTransloaditClient = new TransloaditClient({
    authKey: nconf.get('transloadit:key'),
    authSecret: nconf.get('transloadit:secret')
  });

  return singletonTransloaditClient;
}

var redisClient = redis.getClient();

function randomString(length) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}

async function parseAndValidateTransloadit(user, input) {
  var templateId;

  switch (input.type) {
    case 'image':
      templateId = nconf.get('transloadit:template_image_id');
      break;

    case 'avatar':
      templateId = nconf.get('transloadit:template_avatar_id');
      break;

    default:
      // default to a document type
      templateId = nconf.get('transloadit:template_id');
      break;
  }

  /*
  NOTE: All the ngonf config vars used above are defined in all the config
  files, but for some reason the old code validated that template_image_id is
  truthy before using it, so just making sure here for now because using the
  document template type in place of an avatar would just be broken anyway.
  */
  if (!templateId) {
    throw new StatusError(500, 'templateId required');
  }

  var params = {
    auth: {},
    template_id: templateId,
    fields: {},
    steps: {}
  };

  var metadata = {
    type: input.type,
    user_id: user.id
  };

  // NOTE: This doesn't actually check that room or group uri makes sense for
  // room or group id.

  if (input.room_id) {
    // Any member of the room who can write a message, can upload something to a room.
    const policy = await policyFactory.createPolicyForRoomId(user, input.room_id);
    const writeAccess = await policy.canWrite();
    if (!writeAccess) {
      throw new StatusError(403);
    }

    // upload a document or image to a room
    metadata.room_id = input.room_id;

    params.auth.max_size = 20971520; // 20MB
    params.fields.room_id = input.room_id;
    params.steps.export_originals = {
      path: '${fields.room_id}/${fields.token}/${file.url_name}'
    };
    params.steps.export_thumbs = {
      path: '${fields.room_id}/${fields.token}/thumb/${file.url_name}'
    };
  } else if (input.type === 'avatar' && input.group_id) {
    const policy = await policyFactory.createPolicyForGroupId(user, input.group_id);
    const writeAccess = await policy.canAdmin();
    if (!writeAccess) {
      throw new StatusError(403);
    }

    // upload an avatar to a group
    metadata.group_id = input.group_id;

    params.auth.max_size = 5242880; // 5MB

    params.steps.export_original = {
      path: 'groups/' + input.group_id + '/original',
      bucket: nconf.get('transloadit:avatars:bucket')
    };
    params.steps.export_thumbs = {
      path: 'groups/' + input.group_id + '/${file.meta.width}',
      bucket: nconf.get('transloadit:avatars:bucket')
    };
  } else {
    throw new StatusError(400, 'room or group info required');
  }

  return {
    params: params,
    metadata: metadata
  };
}

function transloaditSignature(req, res, next) {
  return Promise.try(async () => {
    const info = await parseAndValidateTransloadit(req.user, req.query);

    var params = info.params;
    var metadata = info.metadata;

    var apiBasePath = nconf.get('web:apiBasePath');
    var token = uuid();

    params.fields.token = randomString(4);
    params.notify_url = apiBasePath + '/private/transloadit/' + token;

    // Store the token temporarily to verify Transloadit callback
    var expiry = 30 * 60; // 30 mins to be safe, S3 uploads, etc
    redisClient.setex('transloadit:' + token, expiry, JSON.stringify(metadata));

    var signed = getTransloaditClient().calcSignature(params);
    res.send({
      sig: signed.signature,
      params: signed.params
    });
  }).catch(next);
}

module.exports = transloaditSignature;
module.exports.testOnly = {
  parseAndValidateTransloadit: parseAndValidateTransloadit
};
