#!/usr/bin/env node
'use strict';

process.env.NO_AUTO_INDEX = 1;

var persistence = require('gitter-web-persistence');
var indexManager = require('gitter-web-persistence/lib/index-manager');

function getModels() {
  return Object.keys(persistence)
    .filter(function(key) {
      return key !== 'schemas';
    })
    .map(function(key) {
      return persistence[key];
    });
}

indexManager
  .reconcileIndices(getModels())
  .then(function(results) {
    console.log(JSON.stringify(results, null, '  '));
    process.exit();
  })
  .catch(function(err) {
    console.log(err.stack || err);
    process.exit(1);
  });
