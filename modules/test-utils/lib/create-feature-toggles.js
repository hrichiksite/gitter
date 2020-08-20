'use strict';

const debug = require('debug')('gitter:tests:test-fixtures');
const FeatureToggle = require('gitter-web-persistence').FeatureToggle;
const mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
const fflip = require('fflip');

async function createFeatureToggle(fixtureName, f) {
  debug('Creating %s', fixtureName);

  const result = await mongooseUtils.upsert(
    FeatureToggle,
    { name: f.name },
    {
      $setOnInsert: {
        name: f.name,
        description: f.description || '',
        hidden: f.hidden || false,
        criteria: f.criteria
      }
    }
  );

  return result[0];
}

function createFeatureToggles(expected, fixture) {
  return Promise.all(
    Object.keys(expected)
      .filter(key => key.match(/^featureToggle/))
      .map(async key => {
        const expectedFeatureToggle = expected[key];

        const featureToggle = await createFeatureToggle(key, expectedFeatureToggle);
        fixture[key] = featureToggle;

        // Force a reload of the features now that we just added some new ones
        fflip.reload();

        return featureToggle;
      })
  );
}

module.exports = createFeatureToggles;
