#!/usr/bin/env node
'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var yargs = require('yargs');
var shutdown = require('shutdown');
var StatusError = require('statuserror');
var troupeService = require('gitter-web-rooms/lib/troupe-service');
var groupService = require('gitter-web-groups/lib/group-service');

process.env.DISABLE_API_LISTEN = '1';

var TransloaditClient = require('transloadit');
var transloadit = new TransloaditClient({
  authKey: nconf.get('transloadit:key'),
  authSecret: nconf.get('transloadit:secret')
});

var argv = yargs.argv;
var opts = yargs
  .option('access_token', {
    required: true,
    description: 'access token for the user you want to upload as'
  })
  .option('filename', {
    required: true,
    description: 'the file you want to upload'
  })
  .option('type', {
    required: false,
    description: 'avatar, image or nothing (for documents)'
  })
  .option('room_uri', {
    required: argv.type !== 'avatar',
    description: 'room_uri'
  })
  .option('group_uri', {
    required: argv.type === 'avatar',
    description: 'group_uri'
  })
  .help('help')
  .alias('help', 'h').argv;

function getParams() {
  var params = { type: opts.type };
  if (opts.type === 'avatar') {
    return groupService.findByUri(opts.group_uri, { lean: true }).then(function(group) {
      if (!group) throw new StatusError(404, 'Group not found.');
      params.group_id = group._id.toString();
      return params;
    });
  } else {
    params.room_uri = opts.room_uri;
    return troupeService.findByUri(opts.room_uri).then(function(room) {
      if (!room) throw new StatusError(404, 'Room not found.');
      params.room_id = room._id.toString();
      return params;
    });
  }
}

function run() {
  var request = require('supertest');
  var app = require('../../server/api');

  return getParams()
    .then(function(params) {
      console.log('using params', params);
      return request(app)
        .get('/private/generate-signature')
        .query(params)
        .set('x-access-token', opts.access_token)
        .expect(200);
    })
    .then(function(result) {
      var body = result.body;
      // now use body.sig and body.params to upload a file
      transloadit.addFile('file', opts.filename);
      var assemblyParams = {
        // body.params is stringified for some reason
        params: JSON.parse(body.params),
        // not sure this is necessary
        fields: {
          signature: body.sig
        }
      };
      transloadit.createAssembly(assemblyParams, function(err, result) {
        if (err) {
          console.log('fail');
        } else {
          console.log('success');
        }
        console.log(result);
      });
    });
}

run()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    process.exit(1);
    shutdown.shutdownGracefully(1);
  });
