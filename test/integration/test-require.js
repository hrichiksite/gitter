'use strict';

var path = require('path');

var proxyquireNoCallThru = require('proxyquire').noCallThru();

function resolveModuleName(module) {
  if (module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return module;
  }

  return path.resolve(__dirname + '/../../server/' + module);
}

// when using this require function, the module path should be relative to the server directory
var testRequire = (module.exports = function(module) {
  if (module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return require(module);
  }

  var name = resolveModuleName(module);
  return require(name);
});

testRequire.resolveModuleName = resolveModuleName;

testRequire.withProxies = function(module, proxies, fullProxyNames) {
  if (fullProxyNames) {
    var np = {};
    Object.keys(proxies).forEach(function(key) {
      np[resolveModuleName(key)] = proxies[key];
    });
    proxies = np;
  }

  return proxyquireNoCallThru(resolveModuleName(module), proxies);
};
