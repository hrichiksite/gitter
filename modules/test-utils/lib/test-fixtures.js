'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var Promise = require('bluebird');
var debug = require('debug')('gitter:tests:test-fixtures');
var fixtureUtils = require('./fixture-utils');
var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var _ = require('lodash');
var integrationFixtures = require('./integration-fixtures');

var fixtureSteps = [
  require('./delete-documents'),
  require('./create-feature-toggles'),
  require('./create-users'),
  require('./create-oauth-clients'),
  require('./create-oauth-codes'),
  require('./create-oauth-access-tokens'),
  require('./create-identities'),
  require('./create-groups'),
  require('./create-troupes'),
  require('./create-troupe-meta'),
  require('./create-messages'),
  require('./create-message-reports')
];

function createBaseFixture() {
  return {
    // TODO: deprecate these and use fixtureUtils directly
    generateEmail: fixtureUtils.generateEmail,
    generateName: fixtureUtils.generateName,
    generateUri: fixtureUtils.generateUri,
    generateUsername: fixtureUtils.generateUsername,
    generateGithubId: fixtureUtils.generateGithubId,
    generateGroupUri: fixtureUtils.generateGroupUri,

    cleanup: function(callback) {
      var self = this;

      var count = 0;

      return Promise.all(
        Object.keys(this).map(function(key) {
          var o = self[key];
          if (typeof o.remove === 'function') {
            count++;
            return o.remove();
          }
        })
      )
        .timeout(10000)
        .then(function() {
          debug('Removed %s items', count);
        })
        .nodeify(callback);
    }
  };
}

function createExpectedFixtures(expected) {
  if (!expected) throw new Error('Please provide a fixture');

  return Promise.try(createBaseFixture)
    .then(function(fixture) {
      return Promise.mapSeries(fixtureSteps, function(step) {
        return step(expected, fixture);
      }).return(fixture);
    })
    .catch(err => {
      // Give more information about what failed in the Mongoose validation failure
      if (err && err.name === 'ValidationError') {
        logger.error(err);
      }

      throw err;
    });
}

function fixtureLoaderManual(fixture, expected) {
  debug('Creating fixtures %j', expected);
  return function() {
    if (this && this._skipFixtureSetup) return;
    return createExpectedFixtures(expected).then(function(data) {
      Object.keys(data).forEach(function(key) {
        fixture[key] = data[key];
      });
    });
  };
}

var fixtureLoader = {};
fixtureLoader.manual = fixtureLoaderManual;

fixtureLoader.setup = function(expected) {
  var fixture = {};

  before(fixtureLoaderManual(fixture, expected));
  after(function() {
    if (fixture.cleanup) {
      fixture.cleanup();
    }
  });

  return fixture;
};

fixtureLoader.setupEach = function(expected) {
  var fixture = {};

  beforeEach(function() {
    return fixtureLoaderManual(fixture, _.cloneDeep(expected)).bind(this)();
  });

  afterEach(function() {
    if (fixture && fixture.cleanup) {
      return fixture.cleanup();
    }
  });

  return fixture;
};

fixtureLoader.ensureIntegrationEnvironment = function() {
  const requiredConfigs = Array.prototype.slice.call(arguments);

  const beforeCallback = function() {
    const missing = integrationFixtures.checkConfigSet(requiredConfigs);

    if (!missing.length) {
      // No keys missing, continue with the test
      return;
    }

    // Do we throw an error on missing configuration?
    if (process.env.GITTER_FORCE_INTEGRATION_TESTS) {
      throw new Error('Configuration required for test is missing: ' + missing.join(', '));
    } else {
      logger.warn('Skipping this test due to missing config items', missing.join(', '));
      // Just skip these tests
      this._skipFixtureSetup = true;
      this.skip();
    }
  };

  before(beforeCallback);
  // We have a beforeEach because Mocha doesn't skip nested describes
  beforeEach(beforeCallback);
};

fixtureLoader.disableMongoTableScans = function() {
  var mongoTableScans = require('./mongo-table-scans');
  var didDisable;

  before(function() {
    onMongoConnect()
      .then(mongoTableScans.isDisabled)
      .then(function(isDisabled) {
        if (isDisabled) return;

        return mongoTableScans.disable().then(function() {
          return (didDisable = true);
        });
      });
  });

  after(function() {
    if (didDisable) {
      return mongoTableScans.enable().then(function() {
        didDisable = false;
      });
    }
  });
};

fixtureLoader.createExpectedFixtures = createExpectedFixtures;

// TODO: deprecate these, use them from fixtureUtils
fixtureLoader.generateEmail = fixtureUtils.generateEmail;
fixtureLoader.generateGithubId = fixtureUtils.generateGithubId;
fixtureLoader.generateUri = fixtureUtils.generateUri;

// TODO: remove this legacy code...
_.extend(fixtureLoader, integrationFixtures.fixtures);

module.exports = fixtureLoader;
