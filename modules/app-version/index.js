'use strict';

/* #### See version-files in the Makefile #### */
const fs = require('fs');
const path = require('path');
const winston = require('gitter-web-env').logger;

function readFileSync(fileName) {
  var file = path.join(__dirname, '../..', fileName);
  try {
    if (fs.existsSync(file)) {
      return ('' + fs.readFileSync(file)).trim();
    }
  } catch (e) {
    winston.error('Unable to read ' + file + ': ' + e);
  }
  return '';
}

const assetTag = readFileSync('ASSET_TAG') || 'l';
const commit = readFileSync('GIT_COMMIT') || '';
const branch = readFileSync('VERSION') || 'HEAD';
const version = commit ? commit.substring(0, 6) : 'HEAD-' + Math.floor(Date.now() / 10000);

/* THE NEW */
/* Returns a unique identifier for the current code */
function getVersion() {
  return version;
}

/* Returns the current asset hash or '' */
function getAssetTag() {
  return assetTag;
}

/* Returns the current commit hash */
function getCommit() {
  return commit;
}

/* Returns the current branch or HEAD */
function getBranch() {
  return branch;
}

function getGitlabLink() {
  if (commit) return 'https://gitlab.com/gitlab-org/gitter/webapp/commit/' + commit;

  return '';
}

module.exports = {
  getVersion: getVersion,
  getAssetTag: getAssetTag,
  getCommit: getCommit,
  getBranch: getBranch,
  getGitlabLink: getGitlabLink
};
