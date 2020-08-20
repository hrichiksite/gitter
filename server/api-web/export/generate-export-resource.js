'use strict';

const assert = require('assert');
const StatusError = require('statuserror');
const env = require('gitter-web-env');
const config = env.config;
const stats = env.stats;
const redisClient = env.redis.getClient();
const asyncHandler = require('express-async-handler');
const dolph = require('dolph');
const restSerializer = require('../../serializers/rest-serializer');

function generateExportResource(key, { getIterable, getStrategy }) {
  assert(getIterable);
  assert(getStrategy);

  const rateLimiter = dolph({
    prefix: `export:${key}:`,
    redisClient: redisClient,
    // TODO: Reduce limit to 1 after we are done testing
    limit: process.env.hasOwnProperty('TEST_EXPORT_RATE_LIMIT')
      ? process.env.TEST_EXPORT_RATE_LIMIT
      : 1,
    // 3 hours in seconds
    expiry: 3 * (60 * 60),
    keyFunction: function(req) {
      if (req.user) {
        if (req.authInfo && req.authInfo.client) {
          return req.user.id + ':' + req.authInfo.client.id;
        }

        return req.user.id;
      }

      // Anonymous access tokens
      if (req.authInfo && req.authInfo.accessToken) {
        return req.authInfo.accessToken;
      }

      // Should never get here
      return 'anonymous';
    }
  });

  return {
    id: key,
    respond: function(req, res) {
      res.end();
    },
    index: asyncHandler(async (req, res) => {
      try {
        stats.event(`api.export.${key}`, { userId: req.user && req.user.id });

        await new Promise((resolve, reject) => {
          rateLimiter(req, res, err => {
            if (err) {
              return reject(err);
            }

            return resolve();
          });
        });

        if (!config.get('export:enabled')) {
          throw new StatusError(501, 'Export is disabled');
        }

        if (req.accepts('application/x-ndjson') !== 'application/x-ndjson') {
          // Not Acceptable
          throw new StatusError(406);
        }

        const exportDate = new Date();
        const dateString = `${exportDate.getUTCFullYear()}-${exportDate.getUTCMonth() +
          1}-${exportDate.getUTCDate()}`;

        // https://github.com/ndjson/ndjson-spec#33-mediatype-and-file-extensions
        res.set('Content-Type', 'application/x-ndjson');
        // Force a download
        res.set('Content-Disposition', `attachment;filename=gitter-${key}-${dateString}.ndjson`);

        const [iterable, strategy] = await Promise.all([getIterable(req), getStrategy(req)]);

        let isRequestCanceled = false;
        req.on('close', function() {
          isRequestCanceled = true;
        });

        for await (let item of iterable) {
          // Someone may have canceled their download
          // Throw an error and stop iterating
          if (isRequestCanceled) {
            const requestClosedError = new Error('User closed request');
            requestClosedError.requestClosed = true;
            return Promise.reject(requestClosedError);
          }

          const serializedItem = await restSerializer.serializeObject(item, strategy);

          res.write(`${JSON.stringify(serializedItem)}\n`);
        }
      } catch (err) {
        // Someone canceled the download in the middle of downloading
        if (err.requestClosed) {
          // noop otherwise `express-error-handler` will catch it and Express will complain about "Cannot set headers after they are sent to the client"
          return;
        }
        // Only create a new error if it isn't aleady a StatusError
        else if (!err.status) {
          throw new StatusError(500, err);
        }

        throw err;
      }
    })
  };
}

module.exports = generateExportResource;
