'use strict';

var moment = require('moment');

// checks whether two moment times are on the same date
const isSameDay = (a, b) =>
  a.date() === b.date() && a.month() === b.month() && a.year() === b.year();

/**
 * Returns an abbreviated time format.
 *
 * * If the date is today, returns the time
 * * If the date is this year, returns the full date without a year
 * * Otherwise returns the full
 *
 * option.now makes testing easier
 */
module.exports = function timeFormat(time, { lang, tzOffset, compact, now, forceUtc } = {}) {
  if (!time) return '';

  const momentTime = moment(time);
  if (lang) {
    momentTime.locale(lang === 'en' ? 'en-gb' : lang);
  }

  const parsedOffset = forceUtc ? 0 : tzOffset;
  if (parsedOffset !== undefined) {
    momentTime.utcOffset(-parsedOffset);
  }

  const today = moment(now).utcOffset(momentTime.utcOffset());

  // UTC suffix is used in archive to indicate the timestamp not being local time
  const utcSuffix = forceUtc ? ' [UTC]' : '';
  const formatHoursAndMinutes = compact ? '' : ' HH:mm';
  if (isSameDay(momentTime, today)) {
    // TODO: deal with american `10:20 PM`
    return momentTime.format(`HH:mm${utcSuffix}`);
  }

  if (momentTime.year() === today.year()) {
    return momentTime.format(`MMM DD${formatHoursAndMinutes}${utcSuffix}`);
  }

  return momentTime.format(`MMM DD YYYY${formatHoursAndMinutes}${utcSuffix}`);
};
