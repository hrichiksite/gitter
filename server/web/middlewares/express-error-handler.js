'use strict';

var Promise = require('bluebird');
var env = require('gitter-web-env');
var config = env.config;
var _ = require('lodash');
var urlJoin = require('url-join');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var logout = Promise.promisify(require('./logout'));
var unauthorizedRedirectMap = require('../../utils/unauthorized-redirect-map');

function linkStack(stack) {
  if (!stack) return;
  return stack
    .split(/\n/)
    .map(function(i) {
      return i.replace(/\(([^:]+):(\d+):(\d+)\)/, function(match, file, line, col) {
        var ourCode = file.indexOf('node_modules') === -1;
        var h =
          "(<a href='atm://open/?url=file://" +
          file +
          '&line=' +
          line +
          '&column=' +
          col +
          "'>" +
          file +
          ':' +
          line +
          ':' +
          col +
          '</a>)';
        if (ourCode) h = '<b>' + h + '</b>';
        return h;
      });
    })
    .join('\n');
}

function getTemplateForStatus(status) {
  switch (status) {
    case 404:
      return '' + status;

    default:
      return '500';
  }
}

/* Has to have four args */
// eslint-disable-next-line no-unused-vars
module.exports = function(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  var status = res.statusCode;

  /* Got a 401, the user isn't logged in and this is a browser? */
  if (status === 401 && req.accepts(['json', 'html']) === 'html') {
    var returnUrl = req.originalUrl.replace(/\/~(\w+)$/, '');

    if (err.clientRevoked) {
      return logout(req, res).then(() => {
        return res.redirect(unauthorizedRedirectMap.TOKEN_REVOKED_URL);
      });
    } else if (err.revokedUserAgent) {
      return logout(req, res).then(() => {
        return res.redirect(unauthorizedRedirectMap.USER_AGENT_REVOKED_URL);
      });
    } else if (!req.user && req.session) {
      req.session.returnTo = returnUrl;
      return res.redirect(unauthorizedRedirectMap.LOGIN_URL);
    } else if (!req.user) {
      // This should not really be happening but
      // may do if the gitter client isn't doing
      // oauth properly
      return res.redirect(
        urlJoin(unauthorizedRedirectMap.LOGIN_URL, '?returnTo=' + encodeURIComponent(returnUrl))
      );
    }
  }

  var template = getTemplateForStatus(status);
  var message = (res.locals && res.locals.errorMessage) || `An unknown error occurred ${err}`;
  var extraTemplateValues = {
    title: message
  };

  const errorIdentifer = res.locals && res.locals.errorIdentifer;

  res.format({
    html: function() {
      res.render(
        template,
        _.extend(
          {
            status: status,
            homeUrl: config.get('web:homeurl'),
            currentPath: req.path,
            user: req.user,
            userMissingPrivateRepoScope: req.user && !userScopes.hasGitHubScope(req.user, 'repo'),
            message: message,
            errorIdentifer,
            // Only generate the stack-frames when we need to
            stack: config.get('express:showStack') && err && err.stack && linkStack(err.stack)
          },
          extraTemplateValues
        )
      );
    },
    json: function() {
      res.send({ error: message });
    },
    text: function() {
      res.send('Error: ' + message);
    }
  });
};
