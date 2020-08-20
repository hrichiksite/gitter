'use strict';

function isPhone(req) {
  var agent = req.getParsedUserAgent();
  var device = agent.device;

  if (device && device.family === 'iPad') return false;

  var userAgentString = req.headers['user-agent'];
  return userAgentString && userAgentString.toLowerCase().indexOf('mobile') >= 0;
}

module.exports = isPhone;
