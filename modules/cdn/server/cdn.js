'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
var appVersion = require('gitter-app-version');

function chooseFactory() {
  var useCdn = nconf.getBool('cdn:use');

  if (useCdn) {
    var hosts = nconf.get('cdn:hosts');
    var hostLength = hosts.length;

    if (hostLength > 1) {
      return require('../shared/multi-factory');
    } else {
      return require('../shared/single-factory');
    }
  } else {
    return require('../shared/passthrough-factory');
  }
}

function getCdnPrefix() {
  if (nconf.get('cdn:use')) {
    var cdnPrefix = nconf.get('cdn:prefix');

    if (cdnPrefix) {
      return '/' + cdnPrefix;
    }

    var assetTag = appVersion.getAssetTag();
    return assetTag ? '/_s/' + assetTag : '';
  } else {
    return '';
  }
}

var factory = chooseFactory();

var cdnOptions = {
  emailBasePath: nconf.get('email:emailBasePath'),
  webBasepath: nconf.get('web:basepath'),
  hosts: nconf.get('cdn:hosts'),
  cdnPrefix: getCdnPrefix()
};

module.exports = factory(cdnOptions);
