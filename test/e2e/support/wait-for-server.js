'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));

const opts = require('yargs')
  .option('timeout', {
    alias: 't',
    description: 'Username of the user to remove',
    default: 60000
  })
  .help('help')
  .alias('help', 'h').argv;

function waitForServer(url, timeout) {
  console.log(`Waiting for server ${url} for ${timeout}`);
  let hasTimedOut = false;

  let timeoutId;
  if (timeout >= 0) {
    timeoutId = setTimeout(() => {
      hasTimedOut = true;
    }, timeout);
  }

  return (function waitRecursive() {
    return request({
      uri: url,
      timeout: 4000
    })
      .then(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      })
      .catch(err => {
        if (hasTimedOut) {
          throw new Error(`Unable to connect to server ${url}, ${err}, ${err.stack}`);
        } else {
          return waitRecursive(url);
        }
      });
  })();
}

(async () => {
  await waitForServer(opts._[0], opts.timeout);
  console.log('Found server!');
})();
