'use strict';

var apn = require('apn');
var debug = require('debug')('gitter:infra:ios-notification-gateway');
var env = require('gitter-web-env');
var Promise = require('bluebird');
var EventEmitter = require('events');
var path = require('path');

var iosNotificationGenerator = require('./ios-notification-generator');
var logger = env.logger.get('push-notifications');
var config = env.config;
var errorReporter = env.errorReporter;

var rootDirname = path.resolve(__dirname, '..', '..', '..', '..');

var ERROR_DESCRIPTIONS = {
  0: 'No errors encountered',
  1: 'Processing error',
  2: 'Missing device token',
  3: 'Missing topic',
  4: 'Missing payload',
  5: 'Invalid token size',
  6: 'Invalid topic size',
  7: 'Invalid payload size',
  8: 'Invalid token',
  255: 'None (unknown)'
};

var connections = {
  APPLE: createConnection('Prod', true),
  'APPLE-DEV': createConnection('Dev')
};

function resolveCertConfig(key) {
  var relative = config.get(key);
  if (!relative) return;

  return path.resolve(rootDirname, relative);
}

function sendNotificationToDevice(notificationType, notificationDetails, device) {
  var appleNotification = iosNotificationGenerator(notificationType, notificationDetails, device);
  if (!appleNotification) return false;

  var deviceToken = new apn.Device(device.appleToken);

  var connection = connections[device.deviceType];

  if (connection === false) {
    return false;
  } else if (!connection) {
    return Promise.reject(new Error('unknown device type: ' + device.deviceType));
  }

  connection.pushNotification(appleNotification, deviceToken);

  // timout needed to ensure that the push notification packet is sent.
  // if we dont, SIGINT will kill notifications before they have left.
  // until apn uses proper callbacks, we have to guess that it takes a second.
  return Promise.resolve(true).delay(1000);
}

function createConnection(suffix, isProduction) {
  debug('ios push notification gateway (%s) starting', suffix);

  var certConfigKey = 'apn:cert' + suffix;
  var cert = resolveCertConfig(certConfigKey);
  var keyConfigKey = 'apn:key' + suffix;
  var key = resolveCertConfig(keyConfigKey);

  if (!cert || !key) {
    logger.warn(
      'ios push notification gateway (' +
        suffix +
        ') missing config, ' +
        certConfigKey +
        ':' +
        cert +
        ' ' +
        keyConfigKey +
        ':' +
        key
    );
    return false;
  }

  var connection = new apn.Connection({
    cert: cert,
    key: key,
    production: isProduction,
    connectionTimeout: 60000
  });

  connection.on('error', function(err) {
    logger.error('ios push notification gateway (' + suffix + ') experienced an error', {
      error: err.message
    });
    errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
  });

  connection.on('socketError', function(err) {
    logger.error('ios push notification gateway (' + suffix + ') experienced a socketError', {
      error: err.message
    });
    errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
  });

  connection.on('transmissionError', function(errCode, notification, device) {
    var err = new Error('apn transmission error ' + errCode + ': ' + ERROR_DESCRIPTIONS[errCode]);
    if (errCode === 8) {
      logger.warn(
        'ios push notification gateway (' +
          suffix +
          ') invalid device token for "' +
          suffix +
          '". Need to remove the following device sometime:',
        { device: device }
      );
    } else {
      logger.error('ios push notification gateway (' + suffix + ')', { error: err.message });
      errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
    }
  });

  return connection;
}

function sendBadgeUpdateToDevice(device, badge) {
  if (!device || !device.appleToken) return false;

  var deviceToken = new apn.Device(device.appleToken);
  var connection = connections[device.deviceType];

  if (connection === false) {
    return false;
  } else if (!connection) {
    return false;
  }

  var note = new apn.Notification();
  note.badge = badge;

  connection.pushNotification(note, deviceToken);

  // timout needed to ensure that the push notification packet is sent.
  // if we dont, SIGINT will kill notifications before they have left.
  // until apn uses proper callbacks, we have to guess that it takes a second.
  return Promise.resolve(true).delay(1000);
}

function createFeedbackEmitterForEnv(suffix, isProduction) {
  var emitter = new EventEmitter();

  try {
    debug('ios push notification feedback listener (%s) starting', suffix);

    var certConfigKey = 'apn:cert' + suffix;
    var cert = resolveCertConfig(certConfigKey);
    var keyConfigKey = 'apn:key' + suffix;
    var key = resolveCertConfig(keyConfigKey);

    if (!cert || !key) {
      logger.warn(
        'ios push notification feedback (' +
          suffix +
          ') missing config, ' +
          certConfigKey +
          ':' +
          cert +
          ' ' +
          keyConfigKey +
          ':' +
          key
      );
      return emitter;
    }

    var feedback = new apn.Feedback({
      cert: cert,
      key: key,
      interval: config.get('apn:feedbackInterval'),
      batchFeedback: true,
      production: isProduction
    });

    feedback.on('feedback', function(item) {
      var deviceTokens = item.map(function(item) {
        return item.device.token;
      });

      emitter.emit('deregister', deviceTokens);
    });

    feedback.on('error', function(err) {
      logger.error('ios push notification feedback (' + suffix + ') experienced an error', {
        error: err.message
      });
      errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
    });

    feedback.on('feedbackError', function(err) {
      logger.error('ios push notification feedback (' + suffix + ') experienced a feedbackError', {
        error: err.message
      });
      errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
    });
  } catch (err) {
    logger.error('Unable to start feedback service (' + suffix + ')', { exception: err });
    errorReporter(err, { apnEnv: suffix }, { module: 'ios-notification-gateway' });
  }

  return emitter;
}

function createFeedbackEmitter() {
  /* Only create the feedback listeners for the current environment */
  switch (config.get('NODE_ENV') || 'dev') {
    case 'prod':
      return createFeedbackEmitterForEnv('Prod', true);

    case 'beta':
    case 'dev':
      return createFeedbackEmitterForEnv('Dev');
  }

  return new EventEmitter();
}

module.exports = {
  sendNotificationToDevice: Promise.method(sendNotificationToDevice),
  sendBadgeUpdateToDevice: Promise.method(sendBadgeUpdateToDevice),
  createFeedbackEmitter: createFeedbackEmitter
};
