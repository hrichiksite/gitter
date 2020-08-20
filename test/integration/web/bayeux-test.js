'use strict';

const testRequire = require('../test-require');
const Promise = require('bluebird');
const appEvents = require('gitter-web-appevents');
var env = require('gitter-web-env');
var nconf = env.config;
const bayeuxEventsBridge = testRequire('./event-listeners/bayeux-events-bridge');
const bayeux = testRequire('./web/bayeux');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const http = require('http');
const Faye = require('faye');

describe('bayeux', function() {
  describe('destroyClient', function(done) {
    it('should destroyClient', function() {
      bayeux.destroyClient('abc123', done);
    });
  });

  describe('publish', function() {
    xit('should publish');
  });

  describe('clientExists', function() {
    it('should check client existence #slow', function(done) {
      bayeux.clientExists('abc456', function(exists) {
        assert.strictEqual(exists, false);
        done();
      });
    });
  });

  describe('authorisor, cluster, bayeux, bayeux-events-bridge integration', () => {
    const fixture = fixtureLoader.setup({
      userToBeBanned1: {},
      userToStay1: {},
      troupe1: { users: ['userToBeBanned1', 'userToStay1'], public: false },
      oAuthClient1: {},
      oAuthAccessToken1: { user: 'userToBeBanned1', client: 'oAuthClient1' },
      oAuthAccessToken2: { user: 'userToStay1', client: 'oAuthClient1' }
    });

    /* Used in test to wait custom amount of time */
    const wait = time =>
      new Promise(resolve =>
        setTimeout(() => {
          resolve();
        }, time)
      );

    /**
     * predicate is a function, we'll periodically check (in time increments)
     * if the predicate evaluates to true. The return promise resolves either when
     * predicate is true or when maxTime in milliseconds has been reached.
     */
    const waitForPredicate = (predicate, increment = 10, maxTime = 500) =>
      new Promise(resolve => {
        let maxTimeReached = false;
        setTimeout(() => {
          maxTimeReached = true;
        }, maxTime);
        const waitForIncrementOrMaxTime = () =>
          setTimeout(() => {
            if (predicate() || maxTimeReached) {
              resolve();
            } else {
              waitForIncrementOrMaxTime();
            }
          }, increment);
        waitForIncrementOrMaxTime();
      });

    const createAuthenticator = token => ({
      outgoing: (message, callback) => {
        if (message.channel === '/meta/handshake') {
          message.ext = { token: token.toString() };
        }
        callback(message);
      }
    });

    it('should not send message to user who has been removed from a room', async () => {
      bayeuxEventsBridge.install();

      var server = http.createServer();
      bayeux.attach(server);
      const testPort = nconf.get('test:wsPort');
      await server.listen(testPort);

      const clientToBeBanned = new Faye.Client(`http://localhost:${testPort}/bayeux`);
      const clientToStay = new Faye.Client(`http://localhost:${testPort}/bayeux`);
      clientToBeBanned.addExtension(createAuthenticator(fixture.oAuthAccessToken1.token));
      clientToStay.addExtension(createAuthenticator(fixture.oAuthAccessToken2.token));

      let messagesToBeBanned = [];
      let messagesToStay = [];
      // waiting for the subscription to be created before going further
      await clientToBeBanned.subscribe(
        `/api/v1/rooms/${fixture.troupe1.id}/chatMessages`,
        m => (messagesToBeBanned = [...messagesToBeBanned, m])
      );
      await clientToStay.subscribe(
        `/api/v1/rooms/${fixture.troupe1.id}/chatMessages`,
        m => (messagesToStay = [...messagesToStay, m])
      );
      // send the first message
      appEvents.dataChange2(`/rooms/${fixture.troupe1.id}/chatMessages`, 'create', {
        text: 'hello'
      });
      await waitForPredicate(() => messagesToBeBanned.length === 1);
      assert.equal(messagesToBeBanned.length, 1);
      assert.equal(messagesToStay.length, 1);
      // ban userToBeBanned1 (clientToBeBanned)
      appEvents.userRemovedFromTroupe({
        userId: fixture.userToBeBanned1.id,
        troupeId: fixture.troupe1.id
      });
      // send the second message but make sure the user removal had time to propagate
      await wait(50);
      appEvents.dataChange2(`/rooms/${fixture.troupe1.id}/chatMessages`, 'create', {
        text: 'hello2'
      });
      // clientToBeBanned hasn't received the message after being removed from the room
      await waitForPredicate(() => messagesToStay.length === 2);
      assert.equal(messagesToBeBanned.length, 1);
      assert.equal(messagesToStay.length, 2);
    });
  });
});
