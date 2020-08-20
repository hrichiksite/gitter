'use strict';

var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

function toLowerCase(value) {
  return value && value.toLowerCase();
}

/**
 * For exporting things
 */
function getCursorByUserId(userId) {
  const cursor = persistence.Subscription.find({
    userId
  })
    .lean()
    .read(mongoReadPrefs.secondaryPreferred)
    .batchSize(100)
    .cursor();

  return cursor;
}

function findActiveOrgPlans(orgUris) {
  if (!orgUris || !orgUris.length) return Promise.resolve([]);

  var query = mongoUtils.fieldInPredicate('lcUri', orgUris.map(toLowerCase), {
    subscriptionType: 'ORG',
    status: 'CURRENT'
  });

  return persistence.Subscription.find(query).exec();
}

function findActivePlan(uri) {
  var lcUri = toLowerCase(uri);

  return persistence.Subscription.findOne({
    lcUri: lcUri,
    status: 'CURRENT'
  }).exec();
}

function findActivePlans(uris) {
  if (!uris || !uris.length) return Promise.resolve([]);

  var query = mongoUtils.fieldInPredicate('lcUri', uris.map(toLowerCase), {
    status: 'CURRENT'
  });

  return persistence.Subscription.find(query).exec();
}

module.exports = {
  getCursorByUserId,
  findActiveOrgPlans,
  findActivePlan,
  findActivePlans
};
