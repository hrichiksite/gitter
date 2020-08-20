'use strict';

var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var timeFormat = require('gitter-web-shared/time/time-format');

var MS_IN_SECOND = 1000;
var MS_IN_MINUTE = 60 * MS_IN_SECOND;
var MS_IN_HOUR = 60 * MS_IN_MINUTE;
var MS_IN_DAY = 24 * MS_IN_HOUR;

/**
 * If the supplied time is 'today' from the persepective of the
 * user's local timezone, returns the number of milliseconds until
 * midnight in the user's local timezone.
 *
 * For example:
 *   At midnight, will return 86400k
 *   At noon, will return 43200k
 *   At 11pm, will return 3600k
 *   At 11:59:59.000, will return 1k
 *
 * Currently, does not handle daylight savings changeover days.
 */
function timeRemainingTodayLocalTZ(time) {
  if (!time) return 0;

  var now = new Date();
  var nowYear = now.getFullYear();
  var nowMonth = now.getMonth();
  var nowDay = now.getDate();

  if (time instanceof Date) {
    if (
      time.getDate() === nowDay &&
      time.getMonth() === nowMonth &&
      time.getFullYear() === nowYear
    ) {
      return (
        MS_IN_DAY -
        time.getHours() * MS_IN_HOUR +
        time.getMinutes() * MS_IN_MINUTE +
        time.getSeconds() * MS_IN_SECOND +
        time.getMilliseconds()
      );
    }
  }

  // Deal with moment dates
  if (time.date) {
    if (time.date() === nowDay && time.month() === nowMonth && time.year() === nowYear) {
      return (
        MS_IN_DAY -
        time.hour() * MS_IN_HOUR +
        time.minute() * MS_IN_MINUTE +
        time.second() * MS_IN_SECOND +
        time.millisecond()
      );
    }
  }

  return 0;
}

var Behavior = Marionette.Behavior.extend({
  defaults: {
    modelAttribute: null,
    el: null
  },

  ui: function() {
    return {
      time: this.options.el
    };
  },

  modelEvents: function() {
    var result = {};
    result['change:' + this.options.modelAttribute] = 'onTimeChange';
    return result;
  },

  initialize: function() {
    this.timer = null;
  },

  onTimeChange: function(model) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    var time = model.get(this.options.modelAttribute);

    var timeRemaining = timeRemainingTodayLocalTZ(time);
    if (timeRemaining > 0) {
      // Add one millisecond onto the time to make sure that it's definitely
      // into the new day
      this.timer = setTimeout(this.onTimeChange.bind(this, model), timeRemaining + 1);
    }

    this.renderTime(time);
  },

  renderTime: function(time) {
    var timeElement = this.ui.time[0];
    if (timeElement) {
      var text = timeFormat(time, { compact: this.options.compact });
      timeElement.textContent = text;
    }
  },

  onDestroy: function() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
});

behaviourLookup.register('TimeAgo', Behavior);
module.exports = Behavior;
