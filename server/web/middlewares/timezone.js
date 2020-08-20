'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var errorReporter = env.errorReporter;
var userService = require('gitter-web-users');
var debug = require('debug')('gitter:infra:timezone-middleware');

function parseOffset(value) {
  if (value.length !== 5) return;
  var sign = value[0];
  var hours = parseInt(value.substr(1, 2), 10);
  var mins = parseInt(value.substr(3, 2), 10);

  if (sign !== '+' && sign !== '-') return;
  if (isNaN(hours) || isNaN(mins)) return;

  return (sign === '-' ? -1 : 1) * hours * 60 + mins;
}

function parseTimezoneCookie(value) {
  if (!value) return;
  var parts = value.split(':');

  if (parts.length < 1) return;

  var offsetString = parts[0];
  var abbr = parts[1];
  var iana = parts[2];

  var offset = parseOffset(offsetString);
  if (offset === undefined) return;

  return { offset: offset, abbr: abbr, iana: iana };
}

/**
 * Note, does not return a promise as it's indented to be
 * called outside of the promise-chain.
 */
function updateUserTzInfo(user, timezoneInfo) {
  debug('Saving timezone information for user %s: %j', user.username, timezoneInfo);
  userService
    .updateTzInfo(user._id, timezoneInfo)
    .catch(function(err) {
      logger.error('Unable to save timezone info for user', { exception: err });
      errorReporter(err, { user: user.username }, { module: 'timezone-middleware' });
    })
    .done();
}

// eslint-disable-next-line complexity
module.exports = function(req, res, next) {
  /** Parse the cookie if one exists */
  var parsed = parseTimezoneCookie(req.cookies.gitter_tz);
  var userTz = req.user && req.user.tz;

  debug('User presented timezone cookie %j', parsed);

  if (parsed) {
    if (userTz) {
      /* Its possible that the users browser can't do IANA,
       * so just used the saved value if possible */
      if (userTz.offset === parsed.offset && userTz.abbr === parsed.abbr) {
        if (userTz.iana && !parsed.iana) {
          parsed.iana = userTz.iana;
        }
      }

      /* Has the user presented us with new timezone information? If so, update */
      if (
        userTz.offset !== parsed.offset ||
        userTz.abbr !== parsed.abbr ||
        userTz.iana !== parsed.iana
      ) {
        updateUserTzInfo(req.user, parsed);
      }
    } else if (req.user) {
      /* First time we've got timezone information from this user, so save it */
      updateUserTzInfo(req.user, parsed);
    }

    res.locals.tz = parsed;
    res.locals.tzOffset = parsed.offset;
  } else {
    /* The user did not present a cookie.
     * Do we have some saved state for the user? If so, let's use that */
    if (userTz) {
      res.locals.tz = userTz;
      res.locals.tzOffset = userTz.offset;
    } else {
      /* No cookie, no saved state, default to UTC */
      res.locals.tzOffset = 0;
    }
  }

  next();
};
