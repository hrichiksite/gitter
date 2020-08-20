'use strict';

var assert = require('assert');
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var env = require('gitter-web-env');
var errorReporter = env.errorReporter;

function generateQuery(userId, type, policyName, linkPath, externalId) {
  var query;

  if (linkPath && externalId) {
    // Or the whole query to allow mongodb to optimise
    query = {
      $or: [
        {
          userId: userId,
          type: type,
          policyName: policyName,
          linkPath: linkPath
        },
        {
          userId: userId,
          type: type,
          policyName: policyName,
          externalId: externalId
        }
      ]
    };

    return query;
  }

  query = {
    userId: userId,
    type: type,
    policyName: policyName
  };

  if (linkPath) {
    query.linkPath = linkPath;
    return query;
  }

  if (externalId) {
    query.externalId = externalId;
    return query;
  }

  assert(false, 'Expected linkPath or externalId');
}

/**
 * Returns true if a row was inserted or removed
 */
function handle(userId, type, policyName, linkPath, externalId, access) {
  var query = generateQuery(userId, type, policyName, linkPath, externalId);

  if (access) {
    // User has access? Upsert
    var setFields = {
      userId: userId,
      type: type,
      policyName: policyName,
      linkPath: linkPath,
      accessTime: new Date()
    };

    if (externalId) {
      setFields.externalId = externalId;
    }

    return KnownExternalAccess.update(
      query,
      {
        $set: setFields
      },
      {
        upsert: true
      }
    )
      .exec()
      .then(function(response) {
        return !!(response && response.upserted && response.upserted.length === 1);
      })
      .catch(function(err) {
        if (err.code === 11000) {
          // Duplicates can happen,
          // remove all matching and re-add
          return KnownExternalAccess.remove(query)
            .exec()
            .then(function() {
              return KnownExternalAccess.update(
                query,
                {
                  $set: setFields
                },
                {
                  upsert: true
                }
              )
                .exec()
                .then(function(response) {
                  return !!(response && response.upserted && response.upserted.length === 1);
                });
            });
        }

        throw err;
      });
  } else {
    // User does not have access? Remove
    return KnownExternalAccess.remove(query)
      .exec()
      .then(function(response) {
        return !!(response && response.result && response.result.n > 0);
      });
  }
}

/**
 * Records whether a user was granted or denied access to a particular security policy
 */
function knownAccessRecorder(userId, type, policyName, linkPath, externalId, access) {
  if (!userId) return;
  if (!type) return;
  if (!policyName) return;
  if (!linkPath && !externalId) return;

  return handle(userId, type, policyName, linkPath, externalId, access)
    .catch(function(err) {
      errorReporter(err, {}, { module: 'known-access-recorder' });
    })
    .done();
}

module.exports = knownAccessRecorder;
module.exports.testOnly = {
  generateQuery: generateQuery,
  handle: handle
};
