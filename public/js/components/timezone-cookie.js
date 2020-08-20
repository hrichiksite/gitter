'use strict';

var detectTimezone = require('../utils/detect-timezone');
var cookies = require('../utils/cookies');

function parseCookieValue(value) {
  if (!value) return;
  var parts = value.split(':');
  return {
    offset: parts[0],
    abbr: parts[1],
    iana: parts[2]
  };
}

function serialize(timezoneInfo) {
  var s = timezoneInfo.offset;
  if (timezoneInfo.abbr) {
    s += ':' + timezoneInfo.abbr;
  }
  if (timezoneInfo.iana) {
    s += ':' + timezoneInfo.iana;
  }
  return s;
}

var timezoneInfo = detectTimezone();
var existing = parseCookieValue(cookies.get('gitter_tz'));

if (!timezoneInfo.iana) {
  // If the user is using multiple browsers and the current browser doesn't support
  // iana timezones, check if the offset is the same and use the value from
  // the cookie if its available...
  if (existing) {
    if (existing.offset === timezoneInfo.offset && existing.abbr === timezoneInfo.abbr) {
      timezoneInfo.iana = existing.iana;
    }
  }
}

if (
  !existing ||
  existing.offset !== timezoneInfo.offset ||
  existing.abbr !== timezoneInfo.abbr ||
  existing.iana !== timezoneInfo.iana
) {
  cookies.set('gitter_tz', serialize(timezoneInfo));
}
