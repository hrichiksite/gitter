'use strict';

const Promise = require('bluebird');
const TroupeMeta = require('gitter-web-persistence').TroupeMeta;
const debug = require('debug')('gitter:tests:test-fixtures');

function createTroupeMeta(fixtureName, expected) {
  const doc = {
    troupeId: expected.troupeId,
    welcomeMessage: { text: expected.welcomeMessage }
  };
  debug('Creating troupeMeta %s with %j', fixtureName, doc);
  return TroupeMeta.create(doc);
}

async function createAllTroupeMeta(expected, fixture) {
  return Promise.all(
    Object.keys(expected)
      .filter(key => /^troupeMeta/.test(key))
      .map(async key => {
        const expectedTroupeMeta = expected[key];
        const troupe = fixture[expectedTroupeMeta.troupe];
        if (!troupe) throw new Error('Please specify troupe as an existing string id');
        expectedTroupeMeta.troupeId = troupe.id;

        const troupeMeta = await createTroupeMeta(key, expectedTroupeMeta, fixture);
        fixture[key] = troupeMeta;
      })
  );
}

module.exports = createAllTroupeMeta;
