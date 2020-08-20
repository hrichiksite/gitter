'use strict';

var makeBenchmark = require('../make-benchmark');

var presenceService = require('gitter-web-presence');
var _ = require('lodash');
var assert = require('assert');
var Promise = require('bluebird');

var fakeEngine = {
  clientExists: function(socketId, callback) {
    callback(!socketId.match(/^TEST/));
  }
};

function FakeClient(socketId, userId, troupeId, script) {
  _.bindAll(this, 'connect', 'disconnect', 'signalEyeball', 'next');
  this.socketId = socketId;
  this.userId = userId;
  this.troupeId = troupeId;
  this.script = script;
  // this.done = done;
  this.eyeballSignal = 0;
}

FakeClient.prototype = {
  connect: function() {
    return presenceService.userSocketConnected(
      this.userId,
      this.socketId,
      'test',
      'test',
      'fake',
      null,
      this.troupeId,
      null,
      true
    );
  },

  disconnect: function() {
    return presenceService.socketDisconnected(this.socketId);
  },

  signalEyeball: function() {
    var newSignal = this.eyeballSignal ? 0 : 1;
    var self = this;
    return presenceService
      .clientEyeballSignal(this.userId, this.socketId, newSignal)
      .then(function() {
        self.eyeballSignal = newSignal;
      });
  },

  next: Promise.method(function() {
    var nextAction = this.script.shift();
    if (!nextAction) return;
    this.lastAction = nextAction;

    var nextPromise;
    switch (nextAction) {
      case 0:
        nextPromise = this.connect();
        break;

      case 1:
        nextPromise = this.signalEyeball();
        break;

      case 2:
        nextPromise = this.disconnect();
        break;

      default:
        return;
    }

    var self = this;
    return nextPromise.then(function() {
      return self.next();
    });
  })
};

function doTest(iterations) {
  var n = Date.now();

  var iterationsScript = [];
  for (var i = 0; i < iterations; i++) {
    var userId = 'TESTUSER' + i + '-' + n;
    var socketId = 'TESTSOCKET' + i + '-' + n;
    var troupeId = 'TESTTROUPE' + (i % 10) + '-' + n;

    var script = [0];
    for (var j = 1; j < i; j++) {
      script.push(1);
    }
    script.push(2);

    iterationsScript.push({
      socketId: socketId,
      userId: userId,
      troupeId: troupeId,
      script: script
    });
  }

  return Promise.map(
    iterationsScript,
    function(itr) {
      var c = new FakeClient(itr.socketId, itr.userId, itr.troupeId, itr.script);
      return c
        .next()
        .then(function() {
          return presenceService.findOnlineUsersForTroupe(troupeId);
        })
        .then(function(online) {
          assert(online.length === 0);
        });
    },
    { concurrency: 1 }
  );
}

function cleanup(done) {
  return presenceService.collectGarbage(fakeEngine).nodeify(done);
}

makeBenchmark({
  before: function(done) {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    var troupeId = 'TESTTROUPE1' + Date.now();
    var c = new FakeClient(socketId, userId, troupeId, [0, 1, 1, 1, 1, 1, 1, 1, 1, 2]);

    c.next()
      .then(function() {
        return cleanup();
      })
      .nodeify(done);
  },

  after: function(done) {
    cleanup(done);
  },

  tests: {
    'eyeballs-benchmark': function(done) {
      return doTest(100).nodeify(done);
    }
  }
});
