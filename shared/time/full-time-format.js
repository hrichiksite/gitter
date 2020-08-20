'use strict';

var moment = require('moment');

/** Returns an full, unabbreviated time format */
module.exports = function timeFormat(time, options) {
  if (!time) return '';

  var lang, tzOffset;
  if (options) {
    lang = options.lang;
    tzOffset = options.tzOffset;
  }

  time = moment(time);
  if (lang) {
    time.locale(lang === 'en' ? 'en-gb' : lang);
  }

  if (tzOffset !== undefined) {
    time.utcOffset(-tzOffset);
  }

  return time.format('LLL');
};
