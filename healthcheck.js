'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));

const { config } = require('gitter-web-env');

const HEALTH_CHECK_URLS = [config.get('basepath')];

HEALTH_CHECK_URLS.forEach(healthCheckUrl => {
  request({
    method: 'GET',
    uri: healthCheckUrl
  })
    .then(res => {
      // eslint-disable-next-line no-console
      console.log(`STATUS ${healthCheckUrl}: ${res.statusCode}`);
      if (res.statusCode === 200) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error(`Error while trying to connect to ${healthCheckUrl}:`, err, err.stack);
      process.exit(1);
    });
});
