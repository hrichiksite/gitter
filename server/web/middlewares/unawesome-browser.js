'use strict';

var useragent = require('useragent');

module.exports = function(req, res, next) {
  var agent = useragent.parse(req.headers['user-agent']);
  if (agent.family === 'IE' && agent.major < 10) {
    res.relativeRedirect('/-/unawesome-browser');
  } else {
    next();
  }
};
