'use strict';

var moment = require('moment');
var assert = require('assert');

exports.makeDate = function makeDate(year, dayOfYear) {
  return moment({ year: year })
    .add(dayOfYear - 1, 'day')
    .toDate();
};

exports.getStartOfWeek = function getStartOfWeek(momentDate) {
  var currentDay = momentDate.day();
  if (currentDay === 1 /* MONDAY */) return momentDate;

  var daysToSubtract = currentDay === 0 ? /* SUNDAY */ 6 : currentDay - 1;

  var precedingMonday = moment(momentDate.valueOf()).subtract(daysToSubtract, 'days');

  /* Sanity checks */
  assert(precedingMonday.day() === 1, 'Should be monday');
  assert(
    moment.duration(momentDate.diff(precedingMonday)).asDays() <= 6,
    'More than a week difference'
  );

  return precedingMonday;
};
