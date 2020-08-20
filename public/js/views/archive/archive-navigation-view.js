'use strict';

var $ = require('jquery');
var Marionette = require('backbone.marionette');
var moment = require('moment');
var context = require('gitter-web-client-context');
var template = require('./tmpl/archive-navigation-view.hbs');
var heatmapUtils = require('../../components/archive-heatmap-utils');

module.exports = (function() {
  var language = context.lang();

  return Marionette.ItemView.extend({
    ui: {
      navigation: '#archive-navigation'
    },
    template: template,
    serializeData: function() {
      var uri = context.troupe().get('uri');
      const { archiveContext } = this.options;

      const p = archiveContext.previousDate && moment(archiveContext.previousDate).utc();
      const n = archiveContext.nextDate && moment(archiveContext.nextDate).utc();

      const archiveDate = moment(archiveContext.archiveDate)
        .utc()
        .locale(language);

      var ordinalDate = archiveDate.format('Do');
      var numericDate = archiveDate.format('D');

      var ordinalPart;
      if (ordinalDate.indexOf('' + numericDate) === 0) {
        ordinalPart = ordinalDate.substring(('' + numericDate).length);
      } else {
        ordinalPart = '';
      }
      var monthYearFormatted = archiveDate.format('MMMM YYYY');

      return {
        previousDate: p && p.locale(language).format('Do MMM YYYY'),
        dayName: numericDate,
        dayOrdinal: ordinalPart,
        previousDateLink: p && '/' + uri + '/archives/' + p.format('YYYY/MM/DD'),
        nextDate: n && n.locale(language).format('Do MMM YYYY'),
        nextDateLink: n && '/' + uri + '/archives/' + n.format('YYYY/MM/DD'),
        monthYearFormatted: monthYearFormatted
      };
    },

    onRender: function() {
      const archiveDate = this.options.archiveContext && this.options.archiveContext.archiveDate;
      const a = moment(archiveDate).utc();
      var range = 3;

      // if the first day of the next month is in the future, subtract one from range
      var next = moment(new Date(a.year(), a.month(), 1)).add(1, 'months');
      if (next > moment()) {
        range = 2;
      }

      // start and end is only for elasticsearch, so fine if it is outside of
      // the range we're going to display. In fact we deliberately add a day on
      // each end just in case for timezones
      var start = moment(a).subtract(32, 'days');

      heatmapUtils.createResponsiveHeatMap(this.ui.navigation[0], {
        start: start.toDate(),
        range: range
      });

      // See `./archive-heatmap-utils.js->breakpointList` and `trp3Vars.less->@archive-mid`
      if ($(window).width() < 960) {
        $('.js-archive-navigation-wrapper').hide();
      }
      $('.js-toggle-archive-navigation').on('click', function() {
        $('.js-archive-navigation-wrapper').slideToggle();
      });
    }
  });
})();
