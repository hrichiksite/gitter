#!/usr/bin/env node

'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var faye = require('faye');

faye.logger = {};
['fatal', 'error', 'warn', 'info', 'debug'].forEach(function(level) {
  faye.logger[level] = function(message) {
    console.log('faye: ' + message);
  };
});

var client = new faye.Client('https://ws.gitter.im/faye');

client.addExtension({
  outgoing: function(message, callback) {
    if (!message.ext) message.ext = {};

    message.ext.password = nconf.get('ws:superClientPassword');
    callback(message);
  },

  incoming: function(message, callback) {
    callback(message);
  }
});

var subscription = client.subscribe('/api/v1/user/5299eef6ed5ab0b3bf04d082', function(message) {
  console.log('HELLO', message);
});

subscription.then(
  function() {
    console.log('SUBSCRIBED');
  },
  function(err) {
    console.log('FAILED ' + err);
  }
);
