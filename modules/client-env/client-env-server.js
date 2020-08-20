/*eslint-env node */

'use strict';

var config = require('gitter-web-env').config;
var appVersion = require('gitter-app-version');

var env = process.env.NODE_ENV;

var cdns;
if (config.get('cdn:use')) {
  cdns = config.get('cdn:hosts');
}

// This stuff never changes
var troupeEnv = {
  domain: config.get('web:domain'),
  baseServer: config.get('web:baseserver'),
  basePath: config.get('web:basepath'),
  apiBasePath: config.get('web:apiBasePath'),
  homeUrl: config.get('web:homeurl'),
  badgeBaseUrl: config.get('web:badgeBaseUrl'),
  embedBaseUrl: config.get('web:embedBaseUrl'),
  googleTrackingId: config.get('stats:ga:key'),
  googleTrackingDomain: config.get('stats:ga:domain'),
  env: env,
  cdns: cdns,
  version: appVersion.getVersion(),
  assetTag: appVersion.getAssetTag(),
  exportEnabled: config.get('export:enabled'),
  logging: config.get('web:consoleLogging'),
  ravenUrl: config.get('errorReporting:clientRavenUrl'),
  websockets: {
    fayeUrl: config.get('ws:fayeUrl'),
    options: {
      timeout: config.get('ws:fayeTimeout'),
      retry: config.get('ws:fayeRetry')
    }
  },
  avatarsUrl: config.get('avatar:officialHost'),
  avatarCdns: config.get('avatar:hosts'),
  vapidAppServerKey: config.get('vapid:publicKey'),
  headlineNumbers: {
    gitterUsers: config.get('headlineNumbers:gitterUsers'),
    gitterRooms: config.get('headlineNumbers:gitterRooms'),
    gitterGroups: config.get('headlineNumbers:gitterGroups'),
    gitterCountries: config.get('headlineNumbers:gitterCountries')
  },
  inviteEmailAbuseThresholdPerDay: config.get('email:inviteEmailAbuseThresholdPerDay')
};

module.exports = troupeEnv;
