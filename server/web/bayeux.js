'use strict';

var BayeuxCluster = require('./bayeux/cluster');

var cluster = new BayeuxCluster(false);

exports.clientExists = function(clientId, callback) {
  return cluster.clientExists(clientId, callback);
};

exports.publish = function(channel, message) {
  return cluster.publish(channel, message);
};

exports.destroyClient = function(clientId, callback) {
  return cluster.destroyClient(clientId, callback);
};

exports.attach = function(httpServer) {
  return cluster.attach(httpServer);
};

exports.unsubscribeFromTroupe = function(clientId, troupeId) {
  return cluster.unsubscribeFromTroupe(clientId, troupeId);
};
