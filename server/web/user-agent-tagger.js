'use strict';

var isPhone = require('./is-phone');
var isNative = require('./is-native');
var _ = require('lodash');

// prior to 1.2.1, the ios app would incorrectly send its build number instead of the version nubmer
var mobileBuildVersionMapping = {
  '600': '1.2.0',
  '598': '1.1.1',
  '595': '1.1.0',
  '587': '1.0.0'
};

function getType(req, userAgentString) {
  return isPhone(req) || userAgentString.indexOf('Mobile') >= 0 ? 'mobile' : 'desktop';
}

function getGitterAppMetadata(req, userAgentString) {
  // e.g GitterBeta/1.2.0
  var extension = userAgentString.substring(userAgentString.indexOf('Gitter')).split(' ')[0];

  var parts = extension.split('/');

  var family = parts[0];
  var version = parts[1];

  if (getType(req, userAgentString) === 'mobile') {
    version = mobileBuildVersionMapping[version] || version;
  }

  var versionParts = (version || '').split('.');

  return {
    family: family,
    major: versionParts[0] || '',
    minor: versionParts[1] || '',
    patch: versionParts[2] || ''
  };
}

function createVersionString(versionObject) {
  const { major, minor, patch } = versionObject;
  const versionNumbers = [major || '0', minor || '0', patch || '0'];
  return versionNumbers.join('.');
}

function tagify(ua) {
  return {
    'agent:type': ua.type,
    'agent:family': ua.family,
    'agent:version': createVersionString(ua),
    'agent:device:family': ua.device.family,
    'agent:device:version': createVersionString(ua.device),
    'agent:os:family': ua.os.family,
    'agent:os:version': createVersionString(ua.os)
  };
}

module.exports = function(req) {
  var userAgentString = req.headers['user-agent'];

  // no useragentstring? no tags for you.
  if (!userAgentString) return {};

  var userAgentObj = req.getParsedUserAgent().toJSON();

  if (isNative(req)) {
    var appMetadata = getGitterAppMetadata(req, userAgentString);
    userAgentObj = _.extend({}, userAgentObj, appMetadata);
  }
  userAgentObj.type = getType(req, userAgentString);

  return tagify(userAgentObj);
};
