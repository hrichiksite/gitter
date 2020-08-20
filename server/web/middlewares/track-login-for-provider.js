'use strict';

var env = require('gitter-web-env');
var stats = env.stats;

/** TODO move onto its own method once we find the need for it elsewhere
 * isRelativeURL() checks if the URL is relative
 *
 * url      String - the url to be check
 * @return  Boolean - the result of the check
 */
function isRelativeURL(url) {
  var relativeUrl = new RegExp('^/[^/]');
  return relativeUrl.test(url);
}

module.exports = function trackLoginForProvider(provider) {
  return function(req, res, next) {
    var query = req.query;

    // adds the source of the action to the session (for tracking how users
    // 'come in' to the app)
    req.session.source = query.source;

    // checks if we have a relative url path and adds it to the session
    if (query.returnTo && isRelativeURL(query.returnTo)) {
      req.session.returnTo = query.returnTo;
    }

    //send data to stats service
    if (query.action) {
      stats.event(query.action + '_clicked', {
        method: provider + '_oauth',
        button: query.source
      });
    }
    next();
  };
};
