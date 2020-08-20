'use strict';

var $ = require('jquery');

var CalHeatMap = require('@gitterhq/cal-heatmap');
var apiClient = require('./api-client');
var getTimezoneInfo = require('../utils/detect-timezone');
var context = require('gitter-web-client-context');

var SPACEBAR_KEY = 32;
var ENTER_KEY = 13;

// via http://stackoverflow.com/a/8584217/796832
var changeElementType = function($el, newType) {
  var attrs = {};

  $.each($el[0].attributes, function(idx, attr) {
    attrs[attr.name] = attr.value;
  });

  $el.replaceWith(function() {
    return $('<' + newType + '/>', attrs).append($el.contents());
  });
};

var today = new Date();
var elevenFullMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
var gitterLaunchDate = new Date(2013, 10, 1); // 1 November 2013

// Not sure what mangleHeatmap does but it was there before
var mangleHeatmap = function() {
  var $rects = $('.graph-rect').not('.q1,.q2,.q3,.q4,.q5');
  $rects.each(function(i, el) {
    el.classList.remove('hover_cursor');
    el.classList.add('empty');
  });
};

var calHeatmapDefaults = {
  // eleven months + this partial month = 12 blocks shown
  start: elevenFullMonthsAgo,
  maxDate: today,
  minDate: gitterLaunchDate,
  range: 12,
  domain: 'month',
  subDomain: 'day',
  considerMissingDataAsZero: false,
  displayLegend: false,
  data: {},
  previousSelector: '.previous-domain',
  nextSelector: '.next-domain',
  onMinDomainReached: function(reached) {
    if (reached) {
      $('.previous-domain').addClass('disabled');
    } else {
      $('.previous-domain').removeClass('disabled');
    }
  },
  onMaxDomainReached: function(reached) {
    if (reached) {
      $('.next-domain').addClass('disabled');
    } else {
      $('.next-domain').removeClass('disabled');
    }
  },
  onClick: function(date, value) {
    if (!value) return;

    var yyyy = date.getFullYear();
    var mm = date.getMonth() + 1;
    if (mm < 10) mm = '0' + mm;

    var dd = date.getDate();
    if (dd < 10) dd = '0' + dd;

    window.location.assign(
      '/' + context.troupe().get('uri') + '/archives/' + yyyy + '/' + mm + '/' + dd
    );
  },
  onComplete: function() {
    mangleHeatmap();
  }
};

var troupeId = context.getTroupeId();
var tz = getTimezoneInfo().iso;
var getHeatMapDataPromise = apiClient.priv.get('/chat-heatmap/' + troupeId, { tz: tz });

var createHeatMap = function(el, options) {
  var $heatMap = $(el);

  var opts = $.extend(
    {},
    calHeatmapDefaults,
    {
      // Where we insert the calendar
      itemSelector: $heatMap[0]
    },
    options
  );

  // There might be something previously generated in here
  $heatMap.empty();

  var cal = new CalHeatMap();
  cal.init(opts);

  // Populate with data
  getHeatMapDataPromise.then(function(heatMapData) {
    cal.update(heatMapData);

    mangleHeatmap();
    setTimeout(mangleHeatmap, 0);

    // Because `cal-heatmap` uses nested SVG's and x/y attributes this makes it
    // impossible to position via CSS so we change those SVG parents into divs so
    // the SVG x/y position attributes affect the layout
    // We do this after the data has been set because the `cal-heatmap` code relies
    // on the `svg` tags being in place
    var calHeatmapWrappersToChange = [
      $heatMap.find('.cal-heatmap-container'),
      $heatMap.find('.graph')
    ];
    calHeatmapWrappersToChange.forEach(function($el) {
      changeElementType($el, 'div');
    });

    // Also clear out the dimensions `cal-heatmap` decides to put on after updating data
    $heatMap.find('.cal-heatmap-container').css({
      width: '',
      height: ''
    });

    // Make each date selectable
    var dateItemElements = $heatMap.find('.graph-rect');
    // Make them selectable
    dateItemElements.attr('tabindex', 0);
    // Make them accessible to keyboard shortcuts
    dateItemElements.on('keydown', function(e) {
      if (e.keyCode === SPACEBAR_KEY || e.keyCode === ENTER_KEY) {
        var titleText = $(this)
          .siblings('title')
          .text();
        var numItems = parseInt(titleText.replace(/\sitems.*/, ''), 10);
        var dateString = titleText.replace(/.*on\s/, '');
        // Simulate the click callback
        opts.onClick(new Date(dateString), numItems);
      }
    });
  });

  return cal;
};

var createResponsiveHeatMap = function(el, options) {
  var $el = $(el);

  var breakpointList = [
    {
      // See `./archive-heatmap-utils.js->breakpointList` and `trp3Vars.less->@archive-mid`
      maxWidth: 960,
      success: function() {
        createHeatMap(
          $el,
          $.extend(
            {
              cellPadding: 10,
              cellSize: 25
            },
            options
          )
        );
      }
    },
    // default
    {
      maxWidth: 'default',
      success: function() {
        createHeatMap($el, $.extend({}, options));
      }
    }
  ];

  var currentBreakpointIndex = -1;
  var resizeHeatmapCallback = function() {
    var viewportWidth = $(window).width();

    breakpointList.some(function(breakpoint, index) {
      if (viewportWidth < breakpoint.maxWidth || breakpoint.maxWidth === 'default') {
        if (index !== currentBreakpointIndex) {
          if (breakpoint.success) {
            breakpoint.success();
          }
          currentBreakpointIndex = index;
        }

        // break
        return true;
      }

      return false;
    });
  };
  resizeHeatmapCallback();
  $(window).on('resize', resizeHeatmapCallback);
};

module.exports = {
  createHeatMap: createHeatMap,
  createResponsiveHeatMap: createResponsiveHeatMap
};
