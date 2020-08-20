'use strict';

var counter = 0;
var seed = Date.now();

function generateEmail() {
  return 'testuser' + ++counter + seed + '@troupetest.local';
}

function generateName() {
  return `Test ${++counter} ${seed}`;
}

function generateUri(roomType) {
  if (roomType === 'REPO') {
    return `_test_${++counter}${seed}/_repo_${++counter}${Date.now()}`;
  }

  return '_test_' + ++counter + seed;
}

function generateUsername() {
  return `_testuser_${++counter}${seed}`;
}

function generateGithubId() {
  return ++counter + seed;
}

function generateGroupUri(optionalName) {
  return `_${optionalName || 'group'}-${++counter}${Date.now()}`;
}

module.exports = {
  generateEmail: generateEmail,
  generateName: generateName,
  generateUri: generateUri,
  generateUsername: generateUsername,
  generateGithubId: generateGithubId,
  generateGroupUri: generateGroupUri
};
