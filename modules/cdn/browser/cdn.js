'use strict';

var clientEnv = require('gitter-client-env');

var hosts = clientEnv['cdns'];
var assetTag = clientEnv['assetTag'];
var cdnPrefix = assetTag ? '/_s/' + assetTag : '';

function chooseFactory() {
  if (window.location.protocol === 'file:') {
    return require('../shared/native-factory');
  } else if (!hosts || hosts.length === 0) {
    return require('../shared/passthrough-factory');
  } else if (hosts.length === 1) {
    return require('../shared/single-factory');
  } else {
    return require('../shared/multi-factory');
  }
}

var factory = chooseFactory();

var cdnOptions = {
  emailBasePath: null,
  webBasepath: null,
  hosts: hosts,
  cdnPrefix: cdnPrefix
};

module.exports = factory(cdnOptions);
