'use strict';

var moment = require('moment');

module.exports = function isToday(time, now) {
  if (!time) return false;
  var today = moment(now).utcOffset(time.utcOffset());

  return (
    time.date() === today.date() && time.month() === today.month() && time.year() === today.year()
  );
};
