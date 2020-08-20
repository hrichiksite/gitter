'use strict';

var Promise = require('bluebird');
var mongoose = require('gitter-web-mongoose-bluebird');
require('gitter-web-persistence');

function disable() {
  return new Promise(function(resolve, reject) {
    mongoose.connection.db.admin().command(
      {
        setParameter: 1,
        notablescan: 1
      },
      null,
      function(err) {
        if (err) {
          return reject(err);
        }
        resolve();
      }
    );
  });
}

function isDisabled() {
  return new Promise(function(resolve, reject) {
    mongoose.connection.db.admin().command(
      {
        getParameter: 1,
        notablescan: 1
      },
      null,
      function(err, val) {
        if (err) {
          return reject(err);
        }
        resolve(!!val.notablescan);
      }
    );
  });
}

function enable() {
  return new Promise(function(resolve, reject) {
    mongoose.connection.db.admin().command(
      {
        setParameter: 1,
        notablescan: 0
      },
      null,
      function(err, val) {
        if (err) {
          return reject(err);
        }
        resolve(val.notablescan);
      }
    );
  });
}

module.exports = {
  isDisabled: Promise.method(isDisabled),
  disable: Promise.method(disable),
  enable: Promise.method(enable)
};
