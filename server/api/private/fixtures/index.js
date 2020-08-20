'use strict';

const env = require('gitter-web-env');
const logger = env.logger;
const express = require('express');
const asyncHandler = require('express-async-handler');
const identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

const router = express.Router({ caseSensitive: true, mergeParams: true });

router.post(
  '/',
  identifyRoute('fixtures'),
  asyncHandler(async (req, res) => {
    const fixtures = await fixtureLoader.createExpectedFixtures(req.body);

    const fixtureResponse = Object.keys(req.body).reduce((partialResponse, fixtureKey) => {
      partialResponse[fixtureKey] = fixtures[fixtureKey].toJSON();

      // A hack around the serialization and our fixtures adding extra properties onto the Mongoose object
      // See `modules/test-utils/lib/create-users.js`
      if (fixtureKey.match(/^user/)) {
        partialResponse[fixtureKey].accessToken = fixtures[fixtureKey].accessToken;
      }

      return partialResponse;
    }, {});

    logger.info('Fixture endpoint generated some new fixtures', fixtureResponse);

    res.send(fixtureResponse);
  })
);

module.exports = router;
