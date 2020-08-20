'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var onExit = require('signal-exit');
var child_process = require('child_process');
var crossSpawn = require('cross-spawn');

function childProcessToPromise(executable, command) {
  var removeOnExit = onExit(function(code, signal) {
    // Kill the command using the same signal as we received
    command.kill(signal);
  });

  return new Promise(function(resolve, reject) {
    command.on('close', function(code) {
      removeOnExit();
      if (code) {
        reject(new Error(executable + ' exited with ' + code));
      } else {
        resolve();
      }
    });

    command.on('error', function(err) {
      removeOnExit();
      reject(err);
    });
  });
}

function spawn(executable, args, env) {
  return Promise.try(function() {
    return crossSpawn(executable, args, {
      stdio: 'inherit',
      env: _.extend({}, process.env, env)
    });
  }).then(function(command) {
    return childProcessToPromise(executable, command);
  });
}

function fork(script, args, env) {
  return Promise.try(function() {
    return child_process.fork(script, args, {
      stdio: 'inherit',
      env: _.extend({}, process.env, env)
    });
  }).then(function(command) {
    return childProcessToPromise(script, command);
  });
}

module.exports = {
  spawn: spawn,
  fork: fork
};
