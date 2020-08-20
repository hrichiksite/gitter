'use strict';

var Promise = require('bluebird');
var Group = require('gitter-web-persistence').Group;
var fixtureUtils = require('./fixture-utils');
var debug = require('debug')('gitter:tests:test-fixtures');

function createGroup(fixtureName, f) {
  debug('Creating %s', fixtureName);

  var uri = f.uri || fixtureUtils.generateGroupUri(fixtureName);

  var avatarVersion;
  if (f.hasOwnProperty('avatarVersion')) {
    avatarVersion = f.avatarVersion;
  } else {
    if (f.avatarUrl) {
      avatarVersion = 1;
    } else {
      avatarVersion = 0;
    }
  }

  var homeUri = f.homeUri || uri;
  var lcHomeUri = homeUri.toLowerCase();

  var doc = {
    name: f.name || uri,
    uri: uri,
    lcUri: uri.toLowerCase(),
    avatarUrl: f.avatarUrl || null,
    avatarVersion: avatarVersion,
    avatarCheckedDate: f.avatarCheckedDate,
    homeUri: homeUri,
    lcHomeUri: lcHomeUri
  };

  var securityDescriptor = f.securityDescriptor || {};

  var securityDescriptorType;
  if (securityDescriptor.type) {
    securityDescriptorType = securityDescriptor.type;
  } else {
    securityDescriptorType = null;
  }

  var securityDoc = {
    // Permissions stuff
    type: securityDescriptorType,
    members: securityDescriptor.members || 'PUBLIC',
    admins: securityDescriptor.admins || 'MANUAL',
    public: 'public' in securityDescriptor ? securityDescriptor.public : true,
    linkPath: securityDescriptor.linkPath,
    externalId: securityDescriptor.externalId,
    extraMembers: securityDescriptor.extraMembers,
    extraAdmins: securityDescriptor.extraAdmins
  };

  doc.sd = securityDoc;

  debug('Creating group %s with %j', fixtureName, doc);

  return Group.create(doc);
}

function createExtraGroups(expected, fixture, key) {
  // Attach the groups to the troupes
  var obj = expected[key];
  var group = obj.group;
  if (!group) return;

  if (typeof group !== 'string') throw new Error('Please specify the group as a string id');
  if (fixture[group]) {
    // Already specified at the top level
    obj.group = fixture[group];
    return;
  }

  debug('creating extra group %s', group);

  return createGroup(group, {}).then(function(createdGroup) {
    obj.group = createdGroup;
    fixture[group] = createdGroup;
  });
}

function createGroups(expected, fixture) {
  // Create groups
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^group/)) {
      var expectedGroup = expected[key];

      var expectedSecurityDescriptor = expectedGroup && expectedGroup.securityDescriptor;
      if (expectedSecurityDescriptor) {
        expectedSecurityDescriptor.extraMembers =
          expectedSecurityDescriptor.extraMembers &&
          expectedSecurityDescriptor.extraMembers.map(function(user) {
            return fixture[user]._id;
          });

        expectedSecurityDescriptor.extraAdmins =
          expectedSecurityDescriptor.extraAdmins &&
          expectedSecurityDescriptor.extraAdmins.map(function(user) {
            return fixture[user]._id;
          });
      }

      return createGroup(key, expectedGroup).then(function(createdGroup) {
        fixture[key] = createdGroup;
      });
    }

    return null;
  }).then(function() {
    return Promise.map(Object.keys(expected), function(key) {
      if (key.match(/^troupe(?!Meta)/)) {
        return createExtraGroups(expected, fixture, key);
      }

      return null;
    });
  });
}

module.exports = createGroups;
